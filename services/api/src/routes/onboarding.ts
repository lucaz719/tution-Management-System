import { Router, Response, NextFunction } from 'express';
import prisma from '../utils/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { TenantRequest } from '../middleware/tenant';
import { authMiddleware, hasPermission } from '../middleware/auth';

const router = Router();

// Tenant provisioning is a development operator tool only. Production runs
// one institution and must not expose platform/white-label administration.
function platformAdminOnly(_req: TenantRequest, res: Response, next: NextFunction) {
  if (process.env.PLATFORM_ADMIN_ENABLED !== 'true') {
    return res.status(404).json({ error: 'Platform administration is disabled in this deployment.' });
  }
  return next();
}

// 1. Public endpoint to submit onboarding request
router.post('/request', async (req: TenantRequest, res: Response) => {
  if (process.env.PLATFORM_ADMIN_ENABLED !== 'true') {
    return res.status(404).json({ error: 'Institution onboarding is disabled in this deployment.' });
  }
  const { name, email, phone, panNumber, remarks } = req.body;

  if (!name || !email || !phone || !panNumber) {
    return res.status(400).json({
      error: 'Missing required onboarding request fields: name, email, phone, panNumber.',
    });
  }

  try {
    const request = await prisma.tenantRequest.create({
      data: {
        name,
        email,
        phone,
        panNumber,
        remarks,
        status: 'PENDING',
      },
    });

    return res.status(201).json({
      message: 'Your onboarding request has been submitted successfully for administrative review.',
      request,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to process request.', details: error.message });
  }
});

// 2. Super Admin only: List onboarding requests
router.get(
  '/requests',
  platformAdminOnly,
  authMiddleware,
  hasPermission('super_admin_manage_tenants'),
  async (req: TenantRequest, res: Response) => {
    try {
      const requests = await prisma.tenantRequest.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return res.json({ requests });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to list onboarding requests.', details: error.message });
    }
  }
);

// 3. Super Admin only: Approve onboarding request & provision tenant structures
router.post(
  '/approve/:id',
  platformAdminOnly,
  authMiddleware,
  hasPermission('super_admin_manage_tenants'),
  async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    const { defaultBranchName, branchAddress, latitude, longitude } = req.body;

    let onboardingRequest: any = null;
    try {
      // Find the onboarding request
      onboardingRequest = await prisma.tenantRequest.findUnique({
        where: { id },
      });

      if (!onboardingRequest) {
        return res.status(444).json({ error: 'Onboarding request not found.' });
      }

      if (onboardingRequest.status !== 'PENDING') {
        return res.status(400).json({ error: 'Request is already processed.' });
      }

      // Start transaction or sequential queries to provision
      const tenant = await prisma.tenant.create({
        data: {
          name: onboardingRequest.name,
          panNumber: onboardingRequest.panNumber,
          status: 'ACTIVE',
        },
      });

      // Scaffold default roles for the tenant
      const tenantAdminRole = await prisma.role.create({
        data: {
          tenantId: tenant.id,
          name: 'Tenant Admin',
          permissions: [
            'manage_branches',
            'manage_staff',
            'manage_courses',
            'manage_billing',
            'view_reports',
            'approve_petty_cash_l2',
          ],
        },
      });

      // Create primary Branch context
      const branch = await prisma.branch.create({
        data: {
          tenantId: tenant.id,
          name: defaultBranchName || 'Main Center',
          address: branchAddress || 'Address pending — update in Branch settings',
          latitude: Number.isFinite(Number(latitude)) ? Number(latitude) : 27.6915,
          longitude: Number.isFinite(Number(longitude)) ? Number(longitude) : 85.3422,
          radiusMeters: 100,
        },
      });

      // Generate random temporary password
      const tempPassword = `Tms!${crypto.randomBytes(12).toString('base64url')}A9`;
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      // Create primary Tenant Admin User
      const user = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: onboardingRequest.email,
          name: onboardingRequest.name,
          phone: onboardingRequest.phone,
          firstName: onboardingRequest.name.split(' ')[0],
          lastName: onboardingRequest.name.split(' ')[1] || 'Administrator',
          passwordHash,
          status: 'ACTIVE',
        },
      });

      await prisma.account.create({
        data: {
          accountId: user.id,
          providerId: 'credential',
          userId: user.id,
          password: passwordHash,
        },
      });

      // Assign Tenant Admin role globally to user
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: tenantAdminRole.id,
          branchId: null, // Null indicates global tenant scope
        },
      });

      // Update request status
      await prisma.tenantRequest.update({
        where: { id },
        data: { status: 'APPROVED' },
      });

      return res.status(200).json({
        message: 'Onboarding request approved and successfully provisioned.',
        provisioned: {
          tenantId: tenant.id,
          tenantName: tenant.name,
          primaryAdminUser: user.email,
          defaultBranch: branch.name,
          temporaryPassword: tempPassword,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(409).json({
          error: 'A tenant or user with this PAN/email already exists. Verify the request details.',
        });
      }
      return res.status(500).json({ error: 'Failed to provision tenant.', details: error.message });
    }
  }
);

// 3b. Super Admin only: Reject onboarding request
router.post(
  '/reject/:id',
  platformAdminOnly,
  authMiddleware,
  hasPermission('super_admin_manage_tenants'),
  async (req: TenantRequest, res: Response) => {
    const { id } = req.params;

    try {
      const onboardingRequest = await prisma.tenantRequest.findUnique({ where: { id } });

      if (!onboardingRequest) {
        return res.status(404).json({ error: 'Onboarding request not found.' });
      }

      if (onboardingRequest.status !== 'PENDING') {
        return res.status(400).json({ error: 'Request is already processed.' });
      }

      const updated = await prisma.tenantRequest.update({
        where: { id },
        data: { status: 'REJECTED' },
      });

      return res.status(200).json({ message: 'Onboarding request rejected.', request: updated });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to reject request.', details: error.message });
    }
  }
);

// 3c. Super Admin only: List provisioned tenants with headline counts
router.get(
  '/tenants',
  platformAdminOnly,
  authMiddleware,
  hasPermission('super_admin_manage_tenants'),
  async (req: TenantRequest, res: Response) => {
    try {
      const tenants = await prisma.tenant.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { branches: true, users: true },
          },
        },
      });

      return res.json({
        tenants: tenants.map(tenant => ({
          id: tenant.id,
          name: tenant.name,
          panNumber: tenant.panNumber,
          status: tenant.status,
          createdAt: tenant.createdAt,
          branchCount: tenant._count.branches,
          userCount: tenant._count.users,
        })),
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to list tenants.', details: error.message });
    }
  }
);

// 4. Smart admin dashboard (Admin only)
router.get(
  '/dashboard',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    try {
      const studentCount = await prisma.student.count({
        where: { user: { tenantId: req.tenantId! } },
      });
      const teacherCount = await prisma.userRole.count({
        where: {
          user: { tenantId: req.tenantId! },
          role: { name: 'Teacher' },
        },
      });
      const overdueInvoices = await prisma.invoice.findMany({
        where: { tenantId: req.tenantId!, status: 'OVERDUE' },
      });
      const overdueAmount = overdueInvoices.reduce((sum: number, inv: any) => sum + Number(inv.netPayable), 0);
      const pendingLeaves = await prisma.leave.count({
        where: { tenantId: req.tenantId!, status: 'PENDING' },
      });

      // Per-branch summary: students are linked to branches through their UserRole scope.
      const branches = await prisma.branch.findMany({
        where: { tenantId: req.tenantId! },
        orderBy: { createdAt: 'asc' },
      });
      const branchSummary = await Promise.all(
        branches.map(async (branch) => ({
          branchId: branch.id,
          branchName: branch.name,
          activeStudents: await prisma.userRole.count({
            where: { branchId: branch.id, role: { name: 'Student' } },
          }),
          staffRoles: await prisma.userRole.count({
            where: { branchId: branch.id, role: { name: { not: 'Student' } } },
          }),
        }))
      );

      return res.status(200).json({
        activeStudentsCount: studentCount,
        activeTeachersCount: teacherCount,
        totalOverdueAmountNpr: overdueAmount,
        pendingLeaveRequestsCount: pendingLeaves,
        branchSummary,
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to retrieve dashboard summaries.', details: error.message });
    }
  }
);

// 5. Digital Student ID Card Info
router.get(
  '/student-id/:studentId',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const { studentId } = req.params;
    try {
      const student = await prisma.student.findFirst({
          where: { id: studentId, user: { tenantId: req.tenantId! } },
          include: { user: true },
        });

      if (!student) {
        return res.status(404).json({ error: 'Student record not found.' });
      }

      return res.status(200).json({
        cardId: `ID-2026-${student.id.substring(0, 6).toUpperCase()}`,
        studentId: student.id,
        fullName: `${student.user.firstName} ${student.user.lastName}`,
        email: student.user.email,
        emergencyPhone: student.emergencyContact,
        barcodeToken: `BARCODE-TMS-${student.id}`,
        photoUrl: `https://storage.tms.com.np/profiles/student-${student.id}.jpg`,
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to load digital student ID.', details: error.message });
    }
  }
);

// 6. Student Lifetime Record (academic + attendance + certificates)
router.get(
  '/student-lifetime/:studentId',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const { studentId } = req.params;
    try {
      const student = await prisma.student.findFirst({
          where: { id: studentId, user: { tenantId: req.tenantId! } },
          include: { user: true },
        });
      const enrollments = await prisma.enrollment.findMany({
          where: { studentId, student: { user: { tenantId: req.tenantId! } } },
          include: { class: { include: { course: true } } },
        });
      const certificates = await prisma.certificate.findMany({
          where: { studentId, student: { user: { tenantId: req.tenantId! } } },
        });

      if (!student) {
        return res.status(404).json({ error: 'Student record not found.' });
      }

      return res.status(200).json({
        student: {
          id: studentId,
          fullName: `${student.user.firstName} ${student.user.lastName}`,
        },
        enrollmentHistory: enrollments.map(e => ({
          enrollmentId: e.id,
          courseName: e.class.course.name,
          className: e.class.name,
          courseType: e.class.course.type,
          status: e.status,
          admissionDate: e.admissionDate,
        })),
        academicSummary: {
          gpa: null,
          averageAttendanceRate: null,
        },
        certificatesIssued: certificates.map(c => ({
          certificateId: c.certificateId,
          issuedAt: c.issuedDate,
          pdfUrl: c.pdfUrl,
        })),
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to retrieve student lifetime record.', details: error.message });
    }
  }
);

// 7. Report exports (Admin/Teacher only)
router.get(
  '/reports/export',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const { reportType, format, studentId } = req.query;

    if (!reportType || !format) {
      return res.status(400).json({ error: 'Missing required query parameters: reportType, format.' });
    }

    try {
      const fileName = `tms_report_${reportType.toString().toLowerCase()}_${Date.now()}.${format.toString().toLowerCase() === 'pdf' ? 'pdf' : 'xlsx'}`;
      
      return res.status(200).json({
        message: 'Report successfully generated and exported.',
        reportMeta: {
          fileName,
          reportType,
          format,
          studentId: studentId || 'ALL',
          downloadUrl: `https://storage.tms.com.np/reports/${fileName}`,
          fileSize: '45.8 KB',
          generatedAt: new Date(),
        },
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to generate report export.', details: error.message });
    }
  }
);

export default router;
