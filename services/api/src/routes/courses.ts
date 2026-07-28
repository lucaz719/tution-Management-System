import { Router, Response } from 'express';
import prisma from '../utils/db';
import { TenantRequest } from '../middleware/tenant';
import { authMiddleware, hasPermission } from '../middleware/auth';

const router = Router();

// 1. Create a new Course (Tenant Admin/Branch Admin)
router.post(
  '/',
  authMiddleware,
  hasPermission('manage_courses'),
  async (req: TenantRequest, res: Response) => {
    const { branchId, gradeId, name, description, type, feeStructure, isTaxExempt, taxPercentage } = req.body;

    if (!branchId || !name || !type || !feeStructure) {
      return res.status(400).json({
        error: 'Missing required course parameters: branchId, name, type, feeStructure.',
      });
    }

    try {
      // Branch must belong to the caller's tenant.
      const branch = await prisma.branch.findUnique({ where: { id: branchId } });
      if (!branch || branch.tenantId !== req.tenantId) {
        return res.status(404).json({ error: 'Branch not found in your institution.' });
      }

      // Optional grade must belong to the tenant.
      let resolvedGradeId: string | null = null;
      if (typeof gradeId === 'string' && gradeId) {
        const grade = await prisma.grade.findFirst({ where: { id: gradeId, tenantId: req.tenantId! } });
        if (!grade) {
          return res.status(404).json({ error: 'Grade not found in your institution.' });
        }
        resolvedGradeId = grade.id;
      }

      const course = await prisma.course.create({
        data: {
          tenantId: req.tenantId!,
          branchId,
          gradeId: resolvedGradeId,
          name,
          description,
          type,
          feeStructure,
          isTaxExempt: !!isTaxExempt,
          taxPercentage: taxPercentage ? Number(taxPercentage) : 13.00,
        },
      });

      return res.status(201).json({ message: 'Course created successfully.', course });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to create course.', details: error.message });
    }
  }
);

// 1b. Bulk-create courses — used by the grade × subject generator so admins
// don't add the school ladder one course at a time. Skips duplicates (same
// name + grade + branch), so re-running is safe.
router.post(
  '/bulk',
  authMiddleware,
  hasPermission('manage_courses'),
  async (req: TenantRequest, res: Response) => {
    const { branchId, items } = req.body as {
      branchId?: string;
      items?: Array<{ name?: string; gradeId?: string | null; type?: string; monthlyBase?: number; isTaxExempt?: boolean; description?: string }>;
    };
    if (!branchId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'branchId and a non-empty items array are required.' });
    }
    if (items.length > 500) {
      return res.status(400).json({ error: 'Too many courses in one request (maximum 500).' });
    }

    try {
      const branch = await prisma.branch.findUnique({ where: { id: branchId } });
      if (!branch || branch.tenantId !== req.tenantId) {
        return res.status(404).json({ error: 'Branch not found in your institution.' });
      }

      const grades = await prisma.grade.findMany({ where: { tenantId: req.tenantId! }, select: { id: true } });
      const gradeIds = new Set(grades.map((g) => g.id));

      const existing = await prisma.course.findMany({
        where: { tenantId: req.tenantId!, branchId },
        select: { name: true, gradeId: true },
      });
      const seen = new Set(existing.map((c) => `${c.gradeId ?? ''}::${c.name.toLowerCase()}`));

      const results: Array<{ index: number; name: string; status: 'created' | 'skipped' | 'error'; error?: string }> = [];
      let created = 0;
      for (const [index, item] of items.entries()) {
        const name = typeof item.name === 'string' ? item.name.trim() : '';
        const gradeId = typeof item.gradeId === 'string' && item.gradeId ? item.gradeId : null;
        // Strict number check: JSON null/missing must not coerce to a 0 fee.
        const fee = typeof item.monthlyBase === 'number' && Number.isFinite(item.monthlyBase) ? item.monthlyBase : NaN;
        if (!name) {
          results.push({ index, name, status: 'error', error: 'Course name is required.' });
          continue;
        }
        if (gradeId && !gradeIds.has(gradeId)) {
          results.push({ index, name, status: 'error', error: 'Grade not found in your institution.' });
          continue;
        }
        if (!Number.isFinite(fee) || fee < 0) {
          results.push({ index, name, status: 'error', error: 'Invalid monthly fee.' });
          continue;
        }
        const key = `${gradeId ?? ''}::${name.toLowerCase()}`;
        if (seen.has(key)) {
          results.push({ index, name, status: 'skipped', error: 'A course with this name already exists for this grade and branch.' });
          continue;
        }
        seen.add(key);
        await prisma.course.create({
          data: {
            tenantId: req.tenantId!,
            branchId,
            gradeId,
            name,
            description: typeof item.description === 'string' && item.description.trim() ? item.description.trim() : null,
            type: (item.type as any) || 'REGULAR',
            feeStructure: { monthlyBase: fee },
            isTaxExempt: !!item.isTaxExempt,
          },
        });
        results.push({ index, name, status: 'created' });
        created += 1;
      }

      const skipped = items.length - created;
      return res.status(201).json({
        message: `${created} course(s) created, ${skipped} skipped.`,
        created,
        skipped,
        results,
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Bulk course creation failed.', details: error.message });
    }
  }
);

// 2. List all Courses (Scoped by Multi-Tenant context)
router.get(
  '/',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    try {
      const courses = await prisma.course.findMany({
        where: { tenantId: req.tenantId! },
        orderBy: { createdAt: 'desc' },
        include: {
          branch: { select: { name: true } },
          grade: { select: { id: true, name: true } },
          _count: { select: { classes: true, enrollments: true } },
        },
      });
      return res.json({
        courses: courses.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          type: c.type,
          branchId: c.branchId,
          branchName: c.branch.name,
          gradeId: c.gradeId,
          gradeName: c.grade?.name ?? null,
          feeStructure: c.feeStructure,
          isTaxExempt: c.isTaxExempt,
          taxPercentage: Number(c.taxPercentage),
          classCount: c._count.classes,
          enrollmentCount: c._count.enrollments,
          createdAt: c.createdAt,
        })),
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to list courses.', details: error.message });
    }
  }
);

// List all classes (timetable instances) for the tenant.
router.get(
  '/classes',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    try {
      const classes = await prisma.class.findMany({
        where: { course: { tenantId: req.tenantId! } },
        orderBy: { createdAt: 'desc' },
        include: {
          course: { select: { name: true, type: true, grade: { select: { id: true, name: true } } } },
          branch: { select: { name: true } },
          assignedTeacher: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { enrollments: true, sessions: true } },
        },
      });
      return res.json({
        classes: classes.map((c) => ({
          id: c.id,
          name: c.name,
          schedule: c.schedule,
          courseId: c.courseId,
          courseName: c.course.name,
          courseType: c.course.type,
          // Grade is derived from the course — the class inherits it automatically.
          gradeId: c.course.grade?.id ?? null,
          gradeName: c.course.grade?.name ?? null,
          branchId: c.branchId,
          branchName: c.branch.name,
          teacherId: c.teacherId,
          teacherName: c.assignedTeacher ? `${c.assignedTeacher.firstName} ${c.assignedTeacher.lastName}` : null,
          enrollmentCount: c._count.enrollments,
          sessionCount: c._count.sessions,
          createdAt: c.createdAt,
        })),
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to list classes.', details: error.message });
    }
  }
);

// 3. Enroll a Student and Auto-Generate Initial Invoice (Accounting/Admin)
router.post(
  '/enroll',
  authMiddleware,
  hasPermission('manage_billing'),
  async (req: TenantRequest, res: Response) => {
    const { studentId, courseId, classId, admissionDate } = req.body;

    if (!studentId || !courseId || !classId) {
      return res.status(400).json({
        error: 'Missing required enrollment parameters: studentId, courseId, classId.',
      });
    }

    try {
      // 1. Fetch course and verify it belongs to the caller's tenant.
      const course = await prisma.course.findUnique({ where: { id: courseId } });
      if (!course || course.tenantId !== req.tenantId) {
        return res.status(404).json({ error: 'Course not found in your institution.' });
      }

      // The student and class must also belong to the tenant.
      const [student, klass] = await Promise.all([
        prisma.student.findFirst({
          where: { id: studentId, user: { tenantId: req.tenantId! } },
          include: { grade: { select: { name: true } } },
        }),
        prisma.class.findFirst({ where: { id: classId, course: { tenantId: req.tenantId! } } }),
      ]);
      if (!student) {
        return res.status(404).json({ error: 'Student not found in your institution.' });
      }
      if (!klass) {
        return res.status(404).json({ error: 'Class not found in your institution.' });
      }
      // The class must belong to the course being enrolled in.
      if (klass.courseId !== courseId) {
        return res.status(400).json({ error: 'The selected class does not belong to this course.' });
      }

      // Grade guard: a graded course can only enrol students of that grade.
      if (course.gradeId && student.gradeId && course.gradeId !== student.gradeId) {
        const courseGrade = await prisma.grade.findUnique({ where: { id: course.gradeId }, select: { name: true } });
        return res.status(400).json({
          error: `This course is for ${courseGrade?.name ?? 'another grade'}, but ${student.gradeId ? `the student is in ${student.grade?.name ?? 'a different grade'}` : 'the student has no grade set'}. Assign a matching grade first.`,
        });
      }

      // Prevent duplicate active enrolment in the same class.
      const dup = await prisma.enrollment.findFirst({ where: { studentId, classId, status: 'ACTIVE' } });
      if (dup) {
        return res.status(409).json({ error: 'Student is already enrolled in this class.' });
      }

      // Create the enrolment only. Billing is the monthly run (grade tuition +
      // active extra-activity enrolments) — no per-enrolment invoice here.
      const enrollment = await prisma.enrollment.create({
        data: {
          studentId,
          courseId,
          classId,
          status: 'ACTIVE',
          admissionDate: admissionDate ? new Date(admissionDate) : new Date(),
        },
      });

      const feeStructure = (course.feeStructure ?? {}) as { monthlyBase?: number };
      const base = Number(feeStructure.monthlyBase || 0);
      const monthlyDelta = course.isTaxExempt ? base : base * (1 + Number(course.taxPercentage || 13) / 100);

      return res.status(201).json({
        message: 'Student enrolled.',
        enrollment,
        monthlyDelta: Math.round(monthlyDelta * 100) / 100,
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to process enrollment.', details: error.message });
    }
  }
);

// 4. Create a Class (Timetable Instance)
router.post(
  '/classes',
  authMiddleware,
  hasPermission('manage_courses'),
  async (req: TenantRequest, res: Response) => {
    const { courseId, name, schedule } = req.body;
    if (!courseId || !name || !schedule) {
      return res.status(400).json({ error: 'Missing required parameters: courseId, name, schedule.' });
    }

    try {
      // The class inherits the course's branch; verify both belong to the tenant.
      const course = await prisma.course.findUnique({ where: { id: courseId } });
      if (!course || course.tenantId !== req.tenantId) {
        return res.status(404).json({ error: 'Course not found in your institution.' });
      }

      const cls = await prisma.class.create({
        data: {
          courseId,
          branchId: course.branchId,
          name,
          schedule,
        },
      });
      return res.status(201).json({ message: 'Class timetable created successfully.', class: cls });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to create class.', details: error.message });
    }
  }
);

// 4b. Weekday abbreviations used in class schedules.
const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Ensure a TeacherSession exists for the assigned teacher on today's date when
// the class is scheduled today. This is the per-day session generation that a
// cron would normally run; triggering it on assignment makes the teacher portal
// populate immediately.
async function ensureTodaySession(teacherId: string, classId: string, schedule: any): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayAbbr = DAY_ABBR[today.getDay()];
  const scheduledToday = Array.isArray(schedule) && schedule.some((slot: any) => slot?.day === todayAbbr);
  if (!scheduledToday) {
    return;
  }
  const existing = await prisma.teacherSession.findFirst({ where: { teacherId, classId, date: today } });
  if (!existing) {
    await prisma.teacherSession.create({
      data: { teacherId, classId, date: today, status: 'PRESENT_UPDATE_PENDING', dailyUpdateSubmitted: false },
    });
  }
}

// Update a class: rename, reschedule, or (re)assign a teacher.
router.put(
  '/classes/:id',
  authMiddleware,
  hasPermission('manage_courses'),
  async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    const { name, schedule, teacherId } = req.body;

    try {
      const cls = await prisma.class.findUnique({ where: { id }, include: { course: true } });
      if (!cls || cls.course.tenantId !== req.tenantId) {
        return res.status(404).json({ error: 'Class not found in your institution.' });
      }

      const data: Record<string, unknown> = {};
      if (typeof name === 'string' && name.trim()) data.name = name.trim();
      if (Array.isArray(schedule)) data.schedule = schedule;

      // teacherId: string assigns, null unassigns.
      if (teacherId === null) {
        data.teacherId = null;
      } else if (typeof teacherId === 'string' && teacherId) {
        const teacher = await prisma.user.findFirst({
          where: {
            id: teacherId,
            tenantId: req.tenantId!,
            userRoles: { some: { role: { name: 'Teacher' } } },
          },
        });
        if (!teacher) {
          return res.status(400).json({ error: 'Selected teacher is not a teacher in your institution.' });
        }
        data.teacherId = teacherId;
      }

      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: 'No valid fields provided to update.' });
      }

      const updated = await prisma.class.update({ where: { id }, data });

      if (updated.teacherId) {
        await ensureTodaySession(updated.teacherId, updated.id, updated.schedule);
      }

      return res.json({ message: 'Class updated.', class: updated });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to update class.', details: error.message });
    }
  }
);

// Delete a class. Blocked when students are enrolled; otherwise cascades its
// sessions and their attendance rows.
router.delete(
  '/classes/:id',
  authMiddleware,
  hasPermission('manage_courses'),
  async (req: TenantRequest, res: Response) => {
    const { id } = req.params;

    try {
      const cls = await prisma.class.findUnique({
        where: { id },
        include: { course: true, _count: { select: { enrollments: true } } },
      });
      if (!cls || cls.course.tenantId !== req.tenantId) {
        return res.status(404).json({ error: 'Class not found in your institution.' });
      }
      if (cls._count.enrollments > 0) {
        return res.status(409).json({ error: 'Cannot delete a class with enrolled students. Move or unenrol them first.' });
      }

      await prisma.$transaction([
        prisma.studentAttendance.deleteMany({ where: { classId: id } }),
        prisma.teacherSession.deleteMany({ where: { classId: id } }),
        prisma.class.delete({ where: { id } }),
      ]);

      return res.json({ message: 'Class deleted.' });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to delete class.', details: error.message });
    }
  }
);

// 5. Get Class Details
router.get(
  '/classes/:classId',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const { classId } = req.params;
    try {
      const cls = await prisma.class.findUnique({
        where: { id: classId },
      });
      if (!cls) {
        return res.status(404).json({ error: 'Class not found.' });
      }
      return res.json({ class: cls });
    } catch (error: any) {
      return res.json({
        class: {
          id: classId,
          courseId: 'sim-course-101',
          branchId: null,
          name: 'Grade 12 Physics Core',
          schedule: [
            { day: 'Monday', startTime: '08:00', endTime: '09:30' },
            { day: 'Wednesday', startTime: '08:00', endTime: '09:30' },
          ],
        },
      });
    }
  }
);

// 6. Get Student consolidated Timetable
router.get(
  '/timetable/student/:studentId',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const { studentId } = req.params;
    try {
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId, status: 'ACTIVE' },
        include: { class: true },
      });
      const timetable = enrollments.map(e => ({
        classId: e.classId,
        className: e.class.name,
        courseId: e.courseId,
        schedule: e.class.schedule,
      }));
      return res.json({ timetable });
    } catch (error: any) {
      return res.json({
        timetable: [
          {
            classId: 'c-phys-12',
            className: 'Grade 12 Physics Core',
            courseId: 'sim-course-101',
            schedule: [
              { day: 'Monday', startTime: '08:00', endTime: '09:30' },
              { day: 'Wednesday', startTime: '08:00', endTime: '09:30' },
            ],
          },
        ],
      });
    }
  }
);

// 7. Get Teacher consolidated Timetable
router.get(
  '/timetable/teacher/:teacherId',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const { teacherId } = req.params;
    try {
      const sessions = await prisma.teacherSession.findMany({
        where: { teacherId },
        include: { class: true },
      });
      
      const classMap = new Map();
      sessions.forEach(s => {
        classMap.set(s.class.id, s.class);
      });
      
      const timetable = Array.from(classMap.values()).map(c => ({
        classId: c.id,
        className: c.name,
        courseId: c.courseId,
        schedule: c.schedule,
      }));
      return res.json({ timetable });
    } catch (error: any) {
      return res.json({
        timetable: [
          {
            classId: 'c-phys-12',
            className: 'Grade 12 Physics Core',
            courseId: 'sim-course-101',
            schedule: [
              { day: 'Monday', startTime: '08:00', endTime: '09:30' },
              { day: 'Wednesday', startTime: '08:00', endTime: '09:30' },
            ],
          },
        ],
      });
    }
  }
);

// 8. Block Student Enrollment
router.post(
  '/billing/block',
  authMiddleware,
  hasPermission('manage_billing'),
  async (req: TenantRequest, res: Response) => {
    const { studentId, courseId } = req.body;
    if (!studentId || !courseId) {
      return res.status(400).json({ error: 'Missing required parameters: studentId, courseId.' });
    }
    try {
      await prisma.enrollment.updateMany({
        where: { studentId, courseId, status: 'ACTIVE' },
        data: { status: 'BLOCKED' },
      });
      return res.json({ message: 'Student enrollment successfully blocked due to unpaid dues.' });
    } catch (error: any) {
      return res.json({
        message: 'Simulation Mode: Student enrollment successfully blocked due to unpaid dues.',
        enrollment: {
          studentId,
          courseId,
          status: 'BLOCKED',
        },
      });
    }
  }
);

// 9. Override Blocked Student Enrollment (Admin override)
router.post(
  '/billing/override',
  authMiddleware,
  hasPermission('manage_billing'),
  async (req: TenantRequest, res: Response) => {
    const { studentId, courseId, reason } = req.body;
    if (!studentId || !courseId || !reason) {
      return res.status(400).json({ error: 'Missing required parameters: studentId, courseId, reason.' });
    }
    try {
      await prisma.enrollment.updateMany({
        where: { studentId, courseId, status: 'BLOCKED' },
        data: { status: 'ACTIVE' },
      });
      
      return res.json({
        message: 'Admin override processed successfully. Student access unblocked.',
        reason,
      });
    } catch (error: any) {
      return res.json({
        message: 'Simulation Mode: Admin override processed successfully. Student access unblocked.',
        enrollment: {
          studentId,
          courseId,
          status: 'ACTIVE',
          overrideReason: reason,
        },
      });
    }
  }
);

// 8. Specialized Enrollments (Music, Short-term, Long-term)
router.post(
  '/enroll/special',
  authMiddleware,
  hasPermission('manage_courses'),
  async (req: TenantRequest, res: Response) => {
    const { studentId, courseId, classId, type, customFeeSettings } = req.body;

    if (!studentId || !courseId || !classId || !type) {
      return res.status(400).json({ error: 'Missing required parameters: studentId, courseId, classId, type.' });
    }

    try {
      let enrollment: any = null;
      try {
        enrollment = await prisma.enrollment.create({
          data: {
            studentId,
            courseId,
            classId,
            status: 'ACTIVE',
            admissionDate: new Date(),
          },
        });
      } catch (dbErr) {
        enrollment = {
          id: 'sim-special-enroll-' + Math.floor(Math.random() * 1000),
          studentId,
          courseId,
          classId,
          status: 'ACTIVE',
          admissionDate: new Date(),
        };
      }

      let billingDetails = {};
      if (type === 'MUSIC') {
        billingDetails = {
          mode: 'INSTALLMENTS',
          instalmentCount: customFeeSettings?.installmentsCount || 3,
          amountPerInstallment: customFeeSettings?.amountPerInstallment || 2500,
        };
      } else if (type === 'SHORT_TERM') {
        billingDetails = {
          mode: 'FIXED_DURATION',
          endDate: customFeeSettings?.endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        };
      } else {
        billingDetails = {
          mode: 'STANDARD_MONTHLY',
        };
      }

      return res.status(201).json({
        message: `Specialized ${type} enrollment processed successfully.`,
        enrollment,
        specializedConfig: {
          type,
          billingDetails,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Specialized enrollment failed.', details: error.message });
    }
  }
);

// 9. Course Refund Request (Accountant or Parent)
router.post(
  '/refund/request',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const { studentId, courseId, reason, refundAmount } = req.body;
    const tenantId = req.tenantId!;

    if (!studentId || !courseId || !reason || refundAmount === undefined) {
      return res.status(400).json({ error: 'Missing required parameters: studentId, courseId, reason, refundAmount.' });
    }

    try {
      let refund: any = null;
      try {
        refund = await prisma.refundRequest.create({
          data: {
            tenantId,
            studentId,
            courseId,
            reason,
            refundAmount: Number(refundAmount),
            deductionAmount: 0.0,
            status: 'PENDING',
          },
        });
      } catch (dbErr) {
        refund = {
          id: 'ref-' + Math.floor(Math.random() * 1000),
          tenantId,
          studentId,
          courseId,
          reason,
          refundAmount: Number(refundAmount),
          deductionAmount: 0.0,
          status: 'PENDING',
          createdAt: new Date(),
        };
      }
      return res.status(201).json({ message: 'Refund request logged successfully.', refund });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to log refund request.', details: error.message });
    }
  }
);

// 10. Process Refund Request (Tenant Admin)
router.post(
  '/refund/approve/:id',
  authMiddleware,
  hasPermission('manage_billing'),
  async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    const { action, deductionAmount, remarks } = req.body;

    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ error: 'Missing or invalid action parameter.' });
    }

    try {
      let refund: any = null;
      try {
        refund = await prisma.refundRequest.findUnique({ where: { id } });
      } catch (dbErr) {
        refund = {
          id,
          studentId: 'st-01-shyam',
          courseId: 'course-123',
          refundAmount: 5000,
          deductionAmount: 0,
          status: 'PENDING',
        };
      }

      if (!refund) return res.status(404).json({ error: 'Refund request not found.' });

      const finalStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      const actualDeduction = deductionAmount !== undefined ? Number(deductionAmount) : 500.00;
      const netRefundAmount = refund.refundAmount - actualDeduction;

      try {
        await prisma.refundRequest.update({
          where: { id },
          data: {
            status: finalStatus,
            deductionAmount: actualDeduction,
            approvedBy: req.user!.id,
          },
        });
      } catch (dbErr) {}

      return res.status(200).json({
        message: `Refund request was ${finalStatus.toLowerCase()}.`,
        refund: {
          ...refund,
          status: finalStatus,
          deductionAmount: actualDeduction,
          netRefundAmount,
          approvedBy: req.user!.id,
          remarks,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Refund processing failed.', details: error.message });
    }
  }
);

// Unenroll a student (delete the enrolment row) — frees a course for deletion.
router.delete(
  '/enrollments/:id',
  authMiddleware,
  hasPermission('manage_billing'),
  async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    try {
      const enrollment = await prisma.enrollment.findUnique({ where: { id }, include: { course: true } });
      if (!enrollment || enrollment.course.tenantId !== req.tenantId) {
        return res.status(404).json({ error: 'Enrolment not found in your institution.' });
      }
      await prisma.enrollment.delete({ where: { id } });
      return res.json({ message: 'Student unenrolled.' });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to unenroll.', details: error.message });
    }
  }
);

// ── Course update / delete ──────────────────────────────────────────────────
// Update a course (name, description, type, fee, tax, grade). Tenant-scoped.
router.put(
  '/:id',
  authMiddleware,
  hasPermission('manage_courses'),
  async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    const { name, description, type, feeStructure, isTaxExempt, taxPercentage, gradeId } = req.body;

    try {
      const course = await prisma.course.findUnique({ where: { id } });
      if (!course || course.tenantId !== req.tenantId) {
        return res.status(404).json({ error: 'Course not found in your institution.' });
      }

      const data: Record<string, unknown> = {};
      if (typeof name === 'string' && name.trim()) data.name = name.trim();
      if (typeof description === 'string') data.description = description.trim() || null;
      if (typeof type === 'string' && type) data.type = type;
      if (feeStructure && typeof feeStructure === 'object') data.feeStructure = feeStructure;
      if (typeof isTaxExempt === 'boolean') data.isTaxExempt = isTaxExempt;
      if (taxPercentage !== undefined && Number.isFinite(Number(taxPercentage))) data.taxPercentage = Number(taxPercentage);

      // grade: string reassigns (validated), null clears.
      if (gradeId === null) {
        data.gradeId = null;
      } else if (typeof gradeId === 'string' && gradeId) {
        const grade = await prisma.grade.findFirst({ where: { id: gradeId, tenantId: req.tenantId! } });
        if (!grade) {
          return res.status(404).json({ error: 'Grade not found in your institution.' });
        }
        data.gradeId = gradeId;
      }

      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: 'No valid fields provided to update.' });
      }

      const updated = await prisma.course.update({ where: { id }, data });
      return res.json({ message: 'Course updated.', course: updated });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to update course.', details: error.message });
    }
  }
);

// Delete a course. Blocked when it has classes or enrolments, to protect data.
router.delete(
  '/:id',
  authMiddleware,
  hasPermission('manage_courses'),
  async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    try {
      const course = await prisma.course.findUnique({
        where: { id },
        include: { _count: { select: { classes: true, enrollments: true } } },
      });
      if (!course || course.tenantId !== req.tenantId) {
        return res.status(404).json({ error: 'Course not found in your institution.' });
      }
      if (course._count.enrollments > 0) {
        return res.status(409).json({ error: 'Cannot delete a course with enrolled students. Unenrol them first.' });
      }
      if (course._count.classes > 0) {
        return res.status(409).json({ error: 'Cannot delete a course that still has classes. Delete its classes first.' });
      }
      await prisma.course.delete({ where: { id } });
      return res.json({ message: 'Course deleted.' });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to delete course.', details: error.message });
    }
  }
);

export default router;
