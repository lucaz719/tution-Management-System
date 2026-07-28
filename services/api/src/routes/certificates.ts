import { Router, Response, Request } from 'express';
import prisma from '../utils/db';
import { TenantRequest } from '../middleware/tenant';
import { authMiddleware, hasPermission } from '../middleware/auth';
import { CertificateType } from '@tms/types';
import { canAccessBranch, isTenantAdmin } from '../utils/access-control';

const router = Router();

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
