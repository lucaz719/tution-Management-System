import { Router, Response } from 'express';
import prisma from '../utils/db';
import { TenantRequest } from '../middleware/tenant';
import { authMiddleware } from '../middleware/auth';
import { isTenantAdmin } from '../utils/access-control';

const router = Router();

// Production Tenant Admin surface. This must remain independent from the
// development-only platform onboarding router.
router.get('/dashboard', authMiddleware, async (req: TenantRequest, res: Response) => {
  if (!isTenantAdmin(req.user!)) {
    return res.status(403).json({ error: 'Only the Tenant Admin may view institution-wide dashboard summaries.' });
  }

  try {
    const [studentCount, teacherCount, overdueInvoices, pendingLeaves, branches] = await Promise.all([
      prisma.student.count({ where: { user: { tenantId: req.tenantId! } } }),
      prisma.userRole.count({
        where: { user: { tenantId: req.tenantId! }, role: { name: 'Teacher' } },
      }),
      prisma.invoice.findMany({
        where: { tenantId: req.tenantId!, status: 'OVERDUE' },
        select: { netPayable: true },
      }),
      prisma.leave.count({ where: { tenantId: req.tenantId!, status: 'PENDING' } }),
      prisma.branch.findMany({
        where: { tenantId: req.tenantId! },
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true },
      }),
    ]);

    const branchSummary = await Promise.all(
      branches.map(async (branch) => {
        const [activeStudents, staffRoles] = await Promise.all([
          prisma.userRole.count({ where: { branchId: branch.id, role: { name: 'Student' } } }),
          prisma.userRole.count({ where: { branchId: branch.id, role: { name: { not: 'Student' } } } }),
        ]);
        return { branchId: branch.id, branchName: branch.name, activeStudents, staffRoles };
      }),
    );

    return res.json({
      activeStudentsCount: studentCount,
      activeTeachersCount: teacherCount,
      totalOverdueAmountNpr: overdueInvoices.reduce((sum, invoice) => sum + Number(invoice.netPayable), 0),
      pendingLeaveRequestsCount: pendingLeaves,
      branchSummary,
    });
  } catch {
    return res.status(500).json({ error: 'Failed to retrieve dashboard summaries.' });
  }
});

export default router;
