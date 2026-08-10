import { Router, Response } from 'express';
import prisma from '../utils/db';
import { TenantRequest } from '../middleware/tenant';
import { authMiddleware } from '../middleware/auth';
import { hasBranchPermission, isTenantAdmin, managedBranchIds } from '../utils/access-control';

const router = Router();
router.use(authMiddleware);

function branchAllowed(req: TenantRequest, branchId: string, permission: string) {
  return Boolean(branchId && hasBranchPermission(req.user!, permission, branchId));
}

router.get('/dashboard', async (req: TenantRequest, res: Response) => {
  try {
    const tenantWide = isTenantAdmin(req.user!);
    const managedIds = managedBranchIds(req.user!);
    if (!tenantWide && managedIds.length === 0) {
      return res.status(403).json({ error: 'Only an assigned Branch Admin may view this dashboard.' });
    }
    const branches = await prisma.branch.findMany({
      where: { tenantId: req.tenantId!, ...(tenantWide ? {} : { id: { in: managedIds } }) },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    const requestedBranchId = typeof req.query.branchId === 'string' ? req.query.branchId.trim() : '';
    const branchId = requestedBranchId || branches[0]?.id || '';
    if (!branchId || !branches.some((branch) => branch.id === branchId)) {
      return res.status(requestedBranchId ? 403 : 404).json({ error: requestedBranchId ? 'You cannot view this branch dashboard.' : 'No managed branch is assigned.' });
    }

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const [teacherCount, presentTeachers, attendance, blockedEnrollments, invoices, sessions, resources, pettyCash, appointments] = await Promise.all([
      prisma.user.count({ where: { tenantId: req.tenantId!, status: 'ACTIVE', userRoles: { some: { branchId, role: { name: 'Teacher' } } } } }),
      prisma.teacherAttendance.findMany({ where: { branchId, timestamp: { gte: start, lt: end }, stampType: { in: ['IN', 'RE_IN'] } }, select: { userId: true }, distinct: ['userId'] }),
      prisma.studentAttendance.findMany({ where: { date: { gte: start, lt: end }, class: { branchId, course: { tenantId: req.tenantId! } } }, select: { status: true } }),
      prisma.enrollment.findMany({ where: { status: 'BLOCKED', class: { branchId, course: { tenantId: req.tenantId! } } }, select: { studentId: true }, distinct: ['studentId'] }),
      prisma.invoice.findMany({ where: { tenantId: req.tenantId!, status: { in: ['UNPAID', 'OVERDUE'] }, student: { user: { userRoles: { some: { branchId } } } } }, select: { netPayable: true } }),
      prisma.teacherSession.findMany({
        where: { date: { gte: start, lt: end }, class: { branchId, course: { tenantId: req.tenantId! } } },
        include: { class: { include: { course: { select: { name: true } } } }, teacher: { select: { firstName: true, lastName: true } } },
        orderBy: [{ checkInTime: 'asc' }, { createdAt: 'asc' }],
        take: 12,
      }),
      prisma.resourceLog.findMany({ where: { branchId }, orderBy: { createdAt: 'desc' }, take: 8 }),
      prisma.pettyCash.findMany({ where: { tenantId: req.tenantId!, branchId, status: 'PENDING' }, orderBy: { createdAt: 'asc' }, take: 20 }),
      prisma.appointment.findMany({
        where: { tenantId: req.tenantId!, status: 'REQUESTED', student: { enrollments: { some: { status: { in: ['ACTIVE', 'BLOCKED'] }, class: { branchId } } } } },
        include: { requestedBy: { select: { firstName: true, lastName: true } }, student: { include: { user: { select: { firstName: true, lastName: true } } } } },
        orderBy: { createdAt: 'asc' },
        take: 8,
      }),
    ]);
    const markedStudents = attendance.length;
    const presentStudents = attendance.filter((record) => record.status === 'PRESENT').length;

    return res.json({
      branches,
      selectedBranch: branches.find((branch) => branch.id === branchId),
      generatedAt: new Date().toISOString(),
      metrics: {
        teacherAttendance: { present: presentTeachers.length, total: teacherCount, rate: teacherCount ? Math.round(presentTeachers.length / teacherCount * 100) : null },
        studentAttendance: { present: presentStudents, total: markedStudents, rate: markedStudents ? Math.round(presentStudents / markedStudents * 100) : null },
        blockedStudents: blockedEnrollments.length,
        pendingInvoices: invoices.length,
        outstandingAmount: invoices.reduce((sum, invoice) => sum + Number(invoice.netPayable), 0),
        pendingAppointments: appointments.length,
      },
      timetable: sessions.map((session) => ({
        id: session.id,
        time: session.checkInTime ? session.checkInTime.toISOString() : null,
        title: session.class.name,
        detail: `${session.class.course.name} · ${`${session.teacher.firstName} ${session.teacher.lastName}`.trim()}`,
        room: session.class.name,
        status: session.status,
      })),
      resources: resources.map((resource) => ({
        id: resource.id,
        label: resource.classroomId,
        detail: resource.remarks || 'Classroom resource check',
        status: resource.status,
        actionRequired: resource.actionRequired,
        createdAt: resource.createdAt,
      })),
      pettyCash: pettyCash.map((request) => ({ id: request.id, amount: Number(request.amount), purpose: request.purpose, status: request.status })),
      appointments: appointments.map((appointment) => ({
        id: appointment.id,
        parent: `${appointment.requestedBy.firstName} ${appointment.requestedBy.lastName}`.trim(),
        student: `${appointment.student.user.firstName} ${appointment.student.user.lastName}`.trim(),
        preferredTime: appointment.scheduledTime.toISOString(),
        description: appointment.remarks || 'Parent appointment request',
      })),
    });
  } catch {
    return res.status(500).json({ error: 'Failed to load the branch dashboard.' });
  }
});

router.post('/fee-overrides', async (req: TenantRequest, res: Response) => {
  const { branchId, studentId, scope } = req.body;
  const reason = String(req.body.reason || '').trim();
  if (!branchAllowed(req, branchId, 'manage_student_exceptions')) return res.status(403).json({ error: 'You cannot grant overrides for this branch.' });
  if (!studentId || !reason || !['ONE_SESSION', 'ONE_DAY'].includes(scope)) return res.status(400).json({ error: 'Student, reason, and a one-session or one-day scope are required.' });
  const student = await prisma.student.findFirst({ where: { id: studentId, user: { tenantId: req.tenantId! }, enrollments: { some: { class: { branchId }, status: 'BLOCKED' } } } });
  if (!student) return res.status(404).json({ error: 'A fee-blocked student was not found in this branch.' });
  const expiresAt = new Date(Date.now() + (scope === 'ONE_DAY' ? 24 : 3) * 60 * 60 * 1000);
  const override = await prisma.feeAccessOverride.create({ data: { tenantId: req.tenantId!, branchId, studentId, scope, reason, grantedById: req.user!.id, grantedByName: `${req.user!.firstName} ${req.user!.lastName}`.trim(), expiresAt } });
  return res.status(201).json({ message: 'Temporary fee access granted.', override });
});

router.get('/students/:studentId/fee-history', async (req: TenantRequest, res: Response) => {
  const branchId = String(req.query.branchId || '');
  if (!branchAllowed(req, branchId, 'manage_student_exceptions')) return res.status(403).json({ error: 'You cannot view fee history for this branch.' });
  const history = await prisma.feeAccessOverride.findMany({ where: { tenantId: req.tenantId!, branchId, studentId: req.params.studentId }, orderBy: { createdAt: 'desc' } });
  return res.json({ history });
});

router.get('/social-drafts', async (req: TenantRequest, res: Response) => {
  const branchId = String(req.query.branchId || '');
  if (!branchAllowed(req, branchId, 'draft_social_media')) return res.status(403).json({ error: 'You cannot view drafts for this branch.' });
  return res.json({ drafts: await prisma.branchSocialDraft.findMany({ where: { tenantId: req.tenantId!, branchId, authorId: req.user!.id }, orderBy: { updatedAt: 'desc' } }) });
});

router.post('/social-drafts', async (req: TenantRequest, res: Response) => {
  const { branchId, platforms, mediaUrls, proposedTime } = req.body; const text = String(req.body.text || '').trim();
  if (!branchAllowed(req, branchId, 'draft_social_media')) return res.status(403).json({ error: 'You cannot draft posts for this branch.' });
  if (!text || !Array.isArray(platforms) || platforms.length === 0) return res.status(400).json({ error: 'Post text and at least one platform are required.' });
  const draft = await prisma.branchSocialDraft.create({ data: { tenantId: req.tenantId!, branchId, authorId: req.user!.id, text, platforms, mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : [], proposedTime: proposedTime ? new Date(proposedTime) : null, status: 'PENDING_APPROVAL' } });
  return res.status(201).json({ message: 'Draft submitted to Tenant Admin. It has not been published.', draft });
});

router.put('/social-drafts/:id', async (req: TenantRequest, res: Response) => {
  const existing = await prisma.branchSocialDraft.findFirst({ where: { id: req.params.id, tenantId: req.tenantId!, authorId: req.user!.id, status: { in: ['DRAFT', 'PENDING_APPROVAL'] } } });
  if (!existing) return res.status(409).json({ error: 'Only your own unreviewed drafts can be edited.' });
  const draft = await prisma.branchSocialDraft.update({ where: { id: existing.id }, data: { text: String(req.body.text || existing.text).trim(), platforms: Array.isArray(req.body.platforms) ? req.body.platforms : existing.platforms, proposedTime: req.body.proposedTime ? new Date(req.body.proposedTime) : existing.proposedTime } });
  return res.json({ message: 'Draft updated.', draft });
});

router.delete('/social-drafts/:id', async (req: TenantRequest, res: Response) => {
  const result = await prisma.branchSocialDraft.deleteMany({ where: { id: req.params.id, tenantId: req.tenantId!, authorId: req.user!.id, status: { in: ['DRAFT', 'PENDING_APPROVAL'] } } });
  if (!result.count) return res.status(409).json({ error: 'Only your own unreviewed drafts can be deleted.' });
  return res.status(204).send();
});

export default router;
