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
        where: { tenantId: req.tenantId!, teacherId: req.user!.id, status: 'REQUESTED', student: { enrollments: { some: { status: { in: ['ACTIVE', 'BLOCKED'] }, class: { branchId } } } } },
        include: { requestedBy: { select: { firstName: true, lastName: true } }, student: { include: { user: { select: { firstName: true, lastName: true } } } } },
        orderBy: { createdAt: 'asc' }, take: 10,
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
        description: appointment.remarks || 'Parent requested a meeting.',
      })),
    });
  } catch {
    return res.status(500).json({ error: 'Failed to load the branch dashboard.' });
  }
});

router.get('/teacher-workflows', async (req: TenantRequest, res: Response) => {
  const tenantWide = isTenantAdmin(req.user!); const managedIds = managedBranchIds(req.user!);
  const branches = await prisma.branch.findMany({ where: { tenantId: req.tenantId!, ...(tenantWide ? {} : { id: { in: managedIds } }) }, select: { id: true, name: true }, orderBy: { name: 'asc' } });
  const branchId = String(req.query.branchId || branches[0]?.id || '');
  if (!branches.some((branch) => branch.id === branchId)) return res.status(403).json({ error: 'You cannot view teacher workflows for this branch.' });
  const date = req.query.date ? new Date(String(req.query.date)) : new Date(); if (Number.isNaN(date.getTime())) return res.status(400).json({ error: 'Use a valid attendance date.' });
  const start = new Date(date); start.setHours(0, 0, 0, 0); const end = new Date(start); end.setDate(end.getDate() + 1);
  const attendanceSince = new Date(); attendanceSince.setDate(attendanceSince.getDate() - 30);
  const [attendance, syllabi, homework, resultDefinitions, leaves, classes, teachers] = await Promise.all([
    prisma.studentAttendance.findMany({ where: { date: { gte: start, lt: end }, class: { branchId, course: { tenantId: req.tenantId! } } }, include: { student: { include: { user: { select: { firstName: true, lastName: true } } } }, class: { include: { course: { select: { name: true } }, assignedTeacher: { select: { firstName: true, lastName: true } } } } }, orderBy: [{ class: { name: 'asc' } }, { student: { user: { firstName: 'asc' } } }] }),
    prisma.syllabus.findMany({ where: { class: { branchId, course: { tenantId: req.tenantId! } } }, include: { class: { include: { assignedTeacher: { select: { firstName: true, lastName: true } } } }, chapters: { orderBy: { position: 'asc' }, include: { topics: { orderBy: { position: 'asc' }, include: { logs: { orderBy: { logDate: 'desc' }, take: 1 } } } } } }, orderBy: { updatedAt: 'desc' } }),
    prisma.homework.findMany({ where: { class: { branchId, course: { tenantId: req.tenantId! } } }, include: { class: { include: { assignedTeacher: { select: { firstName: true, lastName: true } } } } }, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.resultDefinition.findMany({ where: { tenantId: req.tenantId!, branchId }, orderBy: { testDate: 'desc' } }),
    prisma.leave.findMany({ where: { tenantId: req.tenantId!, branchId, user: { userRoles: { some: { role: { name: 'Teacher' } } } } }, include: { user: { select: { firstName: true, lastName: true } } }, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.class.findMany({ where: { branchId, course: { tenantId: req.tenantId! }, teacherId: { not: null } }, include: { course: { select: { name: true } }, assignedTeacher: { select: { firstName: true, lastName: true } } }, orderBy: { name: 'asc' } }),
    prisma.user.findMany({
      where: { tenantId: req.tenantId!, userRoles: { some: { branchId, role: { name: 'Teacher' } } } },
      select: {
        id: true, firstName: true, lastName: true, email: true, phone: true, status: true, image: true, createdAt: true,
        staffRecord: { select: { joiningDate: true, designation: true, contractType: true, salaryStructure: true, payrolls: { orderBy: [{ year: 'desc' }, { month: 'desc' }], take: 6 } } },
        assignedClasses: { where: { branchId }, select: { id: true, name: true, schedule: true, course: { select: { name: true } }, _count: { select: { enrollments: true } } }, orderBy: { name: 'asc' } },
        teacherAttendance: { where: { branchId, timestamp: { gte: attendanceSince } }, select: { stampType: true, timestamp: true }, orderBy: { timestamp: 'desc' } },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    }),
  ]);
  return res.json({ branches, selectedBranch: branches.find((branch) => branch.id === branchId), date: start.toISOString(), attendance: attendance.map((row) => ({ id: row.id, studentName: `${row.student.user.firstName} ${row.student.user.lastName}`.trim(), className: row.class.name, subject: row.class.course.name, teacherName: row.class.assignedTeacher ? `${row.class.assignedTeacher.firstName} ${row.class.assignedTeacher.lastName}`.trim() : 'Unassigned', status: row.status })), syllabi, homework, resultDefinitions, leaves, classes, teachers });
});

router.post('/result-definitions', async (req: TenantRequest, res: Response) => {
  const { branchId, classId } = req.body; const title = String(req.body?.title || '').trim(); const testDate = new Date(req.body?.testDate);
  if (!branchAllowed(req, branchId, 'manage_branch_calendar')) return res.status(403).json({ error: 'You cannot create results for this branch.' });
  if (!classId || !title || Number.isNaN(testDate.getTime())) return res.status(400).json({ error: 'Class, result title, and test date are required.' });
  const klass = await prisma.class.findFirst({ where: { id: classId, branchId, course: { tenantId: req.tenantId! } }, include: { course: { select: { name: true } } } }); if (!klass) return res.status(404).json({ error: 'Class not found in this branch.' });
  const definition = await prisma.resultDefinition.create({ data: { tenantId: req.tenantId!, branchId, classId, createdBy: req.user!.id, title, subject: klass.course.name, testDate } });
  return res.status(201).json({ message: 'Result created and made available to the assigned teacher.', definition });
});

async function loadManagedResult(req: TenantRequest, resultId: string) {
  const definition = await prisma.resultDefinition.findFirst({
    where: { id: resultId, tenantId: req.tenantId! },
    include: {
      class: {
        include: {
          branch: { select: { id: true, name: true } },
          course: { include: { grade: { select: { id: true, name: true } } } },
          enrollments: {
            where: { status: { in: ['ACTIVE', 'BLOCKED'] } },
            include: { student: { include: { user: { select: { firstName: true, lastName: true } } } } },
            orderBy: { student: { user: { firstName: 'asc' } } },
          },
        },
      },
      scores: { include: { student: { include: { user: { select: { firstName: true, lastName: true } } } } } },
    },
  });
  if (!definition || !branchAllowed(req, definition.branchId, 'manage_branch_calendar')) return null;
  return definition;
}

router.get('/result-definitions/:id/template', async (req: TenantRequest, res: Response) => {
  const definition = await loadManagedResult(req, req.params.id);
  if (!definition) return res.status(404).json({ error: 'Result event not found in a branch you manage.' });
  return res.json({
    filename: `${definition.title}-${definition.class.name}-${definition.subject}`.replace(/[^A-Za-z0-9_-]+/g, '-').toLowerCase() + '.csv',
    columns: ['student_id', 'admission_number', 'student_name', 'score', 'remarks'],
    event: { id: definition.id, title: definition.title, subject: definition.subject, testDate: definition.testDate, className: definition.class.name, gradeName: definition.class.course.grade?.name ?? 'Ungraded', branchName: definition.class.branch.name },
    rows: definition.class.enrollments.map((entry) => ({
      student_id: entry.student.id,
      admission_number: entry.student.admissionNumber ?? '',
      student_name: `${entry.student.user.firstName} ${entry.student.user.lastName}`.trim(),
      score: '',
      remarks: '',
    })),
  });
});

router.post('/result-definitions/:id/import', async (req: TenantRequest, res: Response) => {
  const definition = await loadManagedResult(req, req.params.id);
  if (!definition) return res.status(404).json({ error: 'Result event not found in a branch you manage.' });
  const maximum = Number(req.body?.maximum);
  const passMarks = Number(req.body?.passMarks);
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (!Number.isFinite(maximum) || maximum <= 0 || maximum > 10_000 || !Number.isFinite(passMarks) || passMarks < 0 || passMarks > maximum) {
    return res.status(400).json({ error: 'Full marks and pass marks must be valid, and pass marks cannot exceed full marks.' });
  }
  if (!rows.length || rows.length > 500) return res.status(400).json({ error: 'Upload between 1 and 500 student rows.' });
  const enrolledIds = new Set(definition.class.enrollments.map((entry) => entry.studentId));
  const normalized: Array<{ row: number; studentId: string; score: number }> = rows.map((row: any, index: number) => ({ row: index + 2, studentId: String(row?.studentId || '').trim(), score: Number(row?.score) }));
  const duplicateIds = normalized.filter((row: { studentId: string }, index: number) => normalized.findIndex((candidate: { studentId: string }) => candidate.studentId === row.studentId) !== index).map((row: { studentId: string }) => row.studentId);
  if (duplicateIds.length) return res.status(422).json({ error: `Duplicate student IDs: ${[...new Set(duplicateIds)].join(', ')}` });
  const invalid = normalized.filter((row) => !enrolledIds.has(row.studentId) || !Number.isFinite(row.score) || row.score < 0 || row.score > maximum);
  if (invalid.length) return res.status(422).json({ error: `Invalid student or score on CSV row${invalid.length === 1 ? '' : 's'} ${invalid.map((row) => row.row).join(', ')}.` });
  const sorted = normalized.map((row) => row.score).sort((a, b) => a - b);
  await prisma.$transaction(normalized.map((row) => prisma.studentScore.upsert({
    where: { resultDefinitionId_studentId: { resultDefinitionId: definition.id, studentId: row.studentId } },
    create: { tenantId: req.tenantId!, studentId: row.studentId, recordedBy: req.user!.id, resultDefinitionId: definition.id, subject: definition.subject, assessment: definition.title, score: row.score, maximum, passMarks, percentile: Math.round((sorted.filter((value) => value <= row.score).length / sorted.length) * 10000) / 100, testDate: definition.testDate },
    update: { recordedBy: req.user!.id, score: row.score, maximum, passMarks, percentile: Math.round((sorted.filter((value) => value <= row.score).length / sorted.length) * 10000) / 100, publishedAt: null },
  })));
  return res.json({ message: `${normalized.length} result rows validated and saved as drafts.`, imported: normalized.length });
});

router.get('/result-definitions/:id/report', async (req: TenantRequest, res: Response) => {
  const definition = await loadManagedResult(req, req.params.id);
  if (!definition) return res.status(404).json({ error: 'Result event not found in a branch you manage.' });
  const tenant = await prisma.tenant.findUnique({ where: { id: req.tenantId! }, select: { name: true } });
  return res.json({
    institutionName: tenant?.name ?? 'Tuition Management System',
    event: { id: definition.id, title: definition.title, subject: definition.subject, testDate: definition.testDate, className: definition.class.name, gradeName: definition.class.course.grade?.name ?? 'Ungraded', branchName: definition.class.branch.name },
    results: definition.scores.map((score) => ({ id: score.id, studentId: score.studentId, admissionNumber: definition.class.enrollments.find((entry) => entry.studentId === score.studentId)?.student.admissionNumber ?? '', studentName: `${score.student.user.firstName} ${score.student.user.lastName}`.trim(), score: Number(score.score), maximum: Number(score.maximum), passMarks: Number(score.passMarks ?? 0), percentile: Number(score.percentile ?? 0), published: Boolean(score.publishedAt) })).sort((a, b) => a.studentName.localeCompare(b.studentName)),
  });
});

router.put('/result-definitions/:id', async (req: TenantRequest, res: Response) => {
  const definition = await loadManagedResult(req, req.params.id);
  if (!definition) return res.status(404).json({ error: 'Result event not found in a branch you manage.' });
  const title = req.body?.title === undefined ? definition.title : String(req.body.title).trim();
  const testDate = req.body?.testDate === undefined ? definition.testDate : new Date(req.body.testDate);
  const isOpen = req.body?.isOpen === undefined ? definition.isOpen : req.body.isOpen;
  if (!title || title.length > 160 || Number.isNaN(testDate.getTime()) || typeof isOpen !== 'boolean') return res.status(400).json({ error: 'Use a valid title, test date, and open status.' });
  const updated = await prisma.resultDefinition.update({ where: { id: definition.id }, data: { title, testDate, isOpen } });
  return res.json({ message: 'Result event updated.', definition: updated });
});

router.post('/result-definitions/:id/publish', async (req: TenantRequest, res: Response) => {
  const definition = await loadManagedResult(req, req.params.id);
  if (!definition) return res.status(404).json({ error: 'Result event not found in a branch you manage.' });
  if (!definition.scores.length) return res.status(409).json({ error: 'Upload at least one result before publishing.' });
  const publishedAt = new Date();
  const update = await prisma.studentScore.updateMany({ where: { tenantId: req.tenantId!, resultDefinitionId: definition.id, publishedAt: null }, data: { publishedAt } });
  return res.json({ message: `${update.count} result${update.count === 1 ? '' : 's'} published.`, published: update.count });
});

router.delete('/result-definitions/:id', async (req: TenantRequest, res: Response) => {
  const definition = await loadManagedResult(req, req.params.id);
  if (!definition) return res.status(404).json({ error: 'Result event not found in a branch you manage.' });
  if (definition.scores.some((score) => score.publishedAt)) return res.status(409).json({ error: 'Published result events cannot be deleted. Close the event to prevent further entry.' });
  await prisma.$transaction([prisma.studentScore.deleteMany({ where: { tenantId: req.tenantId!, resultDefinitionId: definition.id } }), prisma.resultDefinition.delete({ where: { id: definition.id } })]);
  return res.status(204).send();
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

export default router;
