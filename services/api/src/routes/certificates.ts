import { Router, Response, Request } from 'express';
import prisma from '../utils/db';
import { TenantRequest } from '../middleware/tenant';
import { authMiddleware, hasPermission } from '../middleware/auth';
import { CertificateType } from '@tms/types';
import { canAccessBranch, isTenantAdmin } from '../utils/access-control';
import PDFDocument from 'pdfkit';

const router = Router();

type HtmlCertificateLayout = { renderMode?: string; html?: string };

const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

function renderCertificateHtml(template: string, values: Record<string, unknown>) {
  const rendered = template.replace(/\{\{\s*([a-zA-Z][a-zA-Z0-9]*)\s*\}\}/g, (_match, key: string) => escapeHtml(values[key] ?? ''));
  return /<html[\s>]/i.test(rendered)
    ? rendered
    : `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${rendered}</body></html>`;
}

router.get('/options', authMiddleware, async (req: TenantRequest, res: Response) => {
  try {
    const [templates, students] = await Promise.all([
      prisma.certificateTemplate.findMany({
        where: { tenantId: req.tenantId! },
        select: { id: true, name: true, type: true, layoutConfig: true },
        orderBy: { name: 'asc' },
      }),
      prisma.student.findMany({
        where: {
          user: { tenantId: req.tenantId! },
          enrollments: { some: { status: { in: ['ACTIVE', 'BLOCKED'] } } },
        },
        select: {
          id: true,
          user: { select: { firstName: true, lastName: true } },
          grade: { select: { name: true } },
          enrollments: {
            where: { status: { in: ['ACTIVE', 'BLOCKED'] } },
            select: { class: { select: { branch: { select: { id: true, name: true } } } } },
          },
        },
        orderBy: { user: { firstName: 'asc' } },
      }),
    ]);
    const options = students.flatMap((student) => {
      const branches = [...new Map(student.enrollments.map((entry) => [entry.class.branch.id, entry.class.branch])).values()];
      return branches
        .filter((branch) => isTenantAdmin(req.user!) || canAccessBranch(req.user!, branch.id))
        .map((branch) => ({
          studentId: student.id,
          studentName: `${student.user.firstName} ${student.user.lastName}`.trim(),
          gradeName: student.grade?.name ?? 'Ungraded',
          branchId: branch.id,
          branchName: branch.name,
        }));
    });
    return res.json({
      templates: templates.map((template) => {
        const layout = template.layoutConfig as HtmlCertificateLayout & { sourceFile?: { name?: string; mimeType?: string } };
        return {
          id: template.id,
          name: template.name,
          type: template.type,
          layoutConfig: {
            renderMode: layout.renderMode === 'HTML' ? 'HTML' : 'FILE',
            ...(layout.sourceFile ? { sourceFile: { name: layout.sourceFile.name ?? '', mimeType: layout.sourceFile.mimeType ?? '' } } : {}),
          },
        };
      }),
      students: options,
    });
  } catch {
    return res.status(500).json({ error: 'Failed to load certificate options.' });
  }
});

router.get(
  '/:certificateId/html',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    try {
      const certificate = await prisma.certificate.findFirst({
        where: { certificateId: req.params.certificateId, template: { tenantId: req.tenantId! } },
        include: {
          template: true,
          branch: true,
          student: { include: { grade: true, user: true, studentParents: { include: { parent: true } } } },
        },
      });
      if (!certificate) return res.status(404).json({ error: 'Certificate not found.' });
      const ownsCertificate = certificate.student.userId === req.user!.id;
      const linkedParent = certificate.student.studentParents.some((link) => link.parent.userId === req.user!.id);
      const staffAccess = isTenantAdmin(req.user!) || canAccessBranch(req.user!, certificate.branchId);
      if (!ownsCertificate && !linkedParent && !staffAccess) return res.status(404).json({ error: 'Certificate not found.' });

      const layout = certificate.template.layoutConfig as HtmlCertificateLayout;
      if (layout.renderMode !== 'HTML' || !layout.html) return res.status(404).json({ error: 'This certificate template has no HTML rendering.' });
      const studentName = `${certificate.student.user.firstName} ${certificate.student.user.lastName}`.trim();
      const html = renderCertificateHtml(layout.html, {
        studentName,
        gradeName: certificate.student.grade?.name ?? 'Enrolled student',
        branchName: certificate.branch.name,
        templateName: certificate.template.name,
        certificateType: certificate.template.type,
        issuedDate: certificate.issuedDate.toLocaleDateString('en-GB'),
        certificateId: certificate.certificateId,
      });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data: https:; font-src data: https:");
      res.setHeader('Cache-Control', 'private, no-store');
      return res.send(html);
    } catch {
      return res.status(500).json({ error: 'Failed to render certificate HTML.' });
    }
  },
);

router.get(
  '/:certificateId/download',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    try {
      const certificate = await prisma.certificate.findFirst({
        where: {
          certificateId: req.params.certificateId,
          template: { tenantId: req.tenantId! },
        },
        include: {
          template: true,
          branch: true,
          student: {
            include: {
              grade: true,
              user: true,
              studentParents: { include: { parent: true } },
            },
          },
        },
      });
      if (!certificate) return res.status(404).json({ error: 'Certificate not found.' });

      const ownsCertificate = certificate.student.userId === req.user!.id;
      const linkedParent = certificate.student.studentParents.some((link) => link.parent.userId === req.user!.id);
      const staffAccess = isTenantAdmin(req.user!) || canAccessBranch(req.user!, certificate.branchId);
      if (!ownsCertificate && !linkedParent && !staffAccess) {
        return res.status(404).json({ error: 'Certificate not found.' });
      }

      const studentName = `${certificate.student.user.firstName} ${certificate.student.user.lastName}`;
      const safeFileName = `${certificate.certificateId}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '_');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
      res.setHeader('Cache-Control', 'private, no-store');

      const document = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 56 });
      document.pipe(res);
      document.rect(28, 28, document.page.width - 56, document.page.height - 56).lineWidth(3).stroke('#1560BD');
      document.rect(38, 38, document.page.width - 76, document.page.height - 76).lineWidth(1).stroke('#FFBC3B');
      document.moveDown(2);
      document.fillColor('#002D72').font('Helvetica-Bold').fontSize(32).text(certificate.branch.name, { align: 'center' });
      document.moveDown(1.4);
      document.fillColor('#1B1F3B').font('Helvetica').fontSize(18).text(certificate.template.name, { align: 'center' });
      document.moveDown(1.5);
      document.fontSize(14).text('This certificate is issued to', { align: 'center' });
      document.moveDown(0.5);
      document.fillColor('#1560BD').font('Helvetica-Bold').fontSize(28).text(studentName, { align: 'center' });
      document.moveDown(0.6);
      document.fillColor('#1B1F3B').font('Helvetica').fontSize(14).text(
        certificate.student.grade ? `Student of ${certificate.student.grade.name}` : 'Enrolled student',
        { align: 'center' },
      );
      document.moveDown(1.5);
      document.fontSize(12).text(`Issued: ${certificate.issuedDate.toLocaleDateString('en-GB')}   •   Verification ID: ${certificate.certificateId}`, { align: 'center' });
      document.end();
    } catch (error: any) {
      if (!res.headersSent) return res.status(500).json({ error: 'Failed to generate certificate PDF.' });
      res.end();
    }
  },
);

// 1. Create a Master Certificate Template (Tenant Admin only)
router.post(
  '/templates',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    if (!isTenantAdmin(req.user!)) {
      return res.status(403).json({ error: 'Only the Tenant Admin may create master certificate templates.' });
    }
    const { name, type, layoutConfig } = req.body;

    if (!name || !type || !layoutConfig) {
      return res.status(400).json({ error: 'Missing required parameters: name, type, layoutConfig.' });
    }
    const htmlLayout = layoutConfig as HtmlCertificateLayout;
    if (htmlLayout.renderMode === 'HTML' && (typeof htmlLayout.html !== 'string' || !htmlLayout.html.trim())) {
      return res.status(400).json({ error: 'HTML certificate templates require HTML content.' });
    }
    if (htmlLayout.renderMode === 'HTML' && htmlLayout.html!.length > 250_000) {
      return res.status(413).json({ error: 'HTML certificate templates must be smaller than 250 KB.' });
    }

    try {
      const template = await prisma.certificateTemplate.create({
        data: {
          tenantId: req.tenantId!,
          name,
          type: type as CertificateType,
          layoutConfig,
        },
      });

      return res.status(201).json({ message: 'Certificate template created successfully.', template });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to create certificate template.' });
    }
  }
);

// 2. Issue a Certificate to a Student (Branch Admin / Tenant Admin)
router.post(
  '/issue',
  authMiddleware,
  hasPermission('issue_certificates'),
  async (req: TenantRequest, res: Response) => {
    const { studentId, templateId, branchId, studentNameHint, courseNameHint } = req.body;

    if (!studentId || !templateId || !branchId) {
      return res.status(400).json({ error: 'Missing required parameters: studentId, templateId, branchId.' });
    }
    if (!canAccessBranch(req.user!, branchId)) {
      return res.status(403).json({ error: 'You may only issue certificates for your assigned branch.' });
    }
    try {
      const [student, template, branch] = await Promise.all([
        prisma.student.findFirst({ where: {
          id: studentId,
          user: { tenantId: req.tenantId! },
          enrollments: { some: { status: { in: ['ACTIVE', 'BLOCKED'] }, class: { branchId } } },
        } }),
        prisma.certificateTemplate.findFirst({ where: { id: templateId, tenantId: req.tenantId! } }),
        prisma.branch.findFirst({ where: { id: branchId, tenantId: req.tenantId! } }),
      ]);
      if (!student || !template || !branch) {
        return res.status(404).json({ error: 'Student, template, or branch was not found, or the student is not enrolled in this branch.' });
      }

      // Generate unique verification ID
      const uniqueHash = Math.random().toString(36).substr(2, 9).toUpperCase();
      const verificationId = `CERT-2026-${uniqueHash}`;

      const certificate = await prisma.certificate.create({
        data: {
          certificateId: verificationId,
          studentId,
          templateId,
          branchId,
          issuerId: req.user!.id,
          pdfUrl: `https://storage.tms.com.np/certs/${verificationId}.pdf`,
        },
      });

      return res.status(201).json({
        message: 'Certificate successfully generated and assigned to student file.',
        certificate,
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to issue certificate.' });
    }
  }
);

// 3. Public Verification Validation (Public, bypasses tenant constraints in middleware)
router.get(
  '/verify/:verificationId',
  async (req: Request, res: Response) => {
    const { verificationId } = req.params;

    try {
      const cert = await prisma.certificate.findUnique({
        where: { certificateId: verificationId },
        include: {
          student: {
            include: {
              user: true,
            },
          },
          template: true,
        },
      });

      if (!cert) {
        return res.status(404).json({ error: 'Certificate verification failed. Record not found.' });
      }

      return res.status(200).json({
        isValid: true,
        certificateId: cert.certificateId,
        studentName: `${cert.student.user.firstName} ${cert.student.user.lastName}`,
        issuedDate: cert.issuedDate,
        templateName: cert.template.name,
        type: cert.template.type,
      });
    } catch (error: any) {
      return res.status(503).json({ isValid: false, error: 'Certificate verification is temporarily unavailable.' });
    }
  }
);

export default router;
