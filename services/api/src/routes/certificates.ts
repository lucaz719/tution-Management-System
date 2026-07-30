import { Router, Response, Request } from 'express';
import prisma from '../utils/db';
import { TenantRequest } from '../middleware/tenant';
import { authMiddleware, hasPermission } from '../middleware/auth';
import { CertificateType } from '@tms/types';
import { canAccessBranch, isTenantAdmin } from '../utils/access-control';
import PDFDocument from 'pdfkit';

const router = Router();

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
    const [student, template, branch] = await Promise.all([
      prisma.student.findFirst({ where: { id: studentId, user: { tenantId: req.tenantId! } } }),
      prisma.certificateTemplate.findFirst({ where: { id: templateId, tenantId: req.tenantId! } }),
      prisma.branch.findFirst({ where: { id: branchId, tenantId: req.tenantId! } }),
    ]);
    if (!student || !template || !branch) {
      return res.status(404).json({ error: 'Student, template, or branch was not found in your institution.' });
    }

    // Generate unique verification ID
    const uniqueHash = Math.random().toString(36).substr(2, 9).toUpperCase();
    const verificationId = `CERT-2026-${uniqueHash}`;

    try {
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
