import { Router, Response } from 'express';
import { CourseType, GradeBillingMode, Prisma } from '@prisma/client';
import prisma from '../utils/db';
import { TenantRequest } from '../middleware/tenant';
import { authMiddleware, hasPermission } from '../middleware/auth';
import { canAccessBranch, hasBranchPermission, isTenantAdmin } from '../utils/access-control';
import { parsePlainRecord, parseStrictKeys, readFiniteNumber, readTrimmedString, type ValidationResult } from '../utils/request-validation';
import { recurringInvoiceType } from '../utils/billing-rules';
import { normalizeSchedule, parseSchedule, SCHEDULE_DAYS, slotsOverlap, type ScheduleSlot } from '../utils/schedule';

const router = Router();
const COURSE_TYPES = new Set<string>(['REGULAR', 'MUSIC', 'SHORT_TERM', 'LONG_TERM', 'PERSONALIZED']);
const ACTIVE_ENROLLMENT_STATUSES = ['ACTIVE', 'BLOCKED'];

async function eligibleTeacher(tenantId: string, branchId: string, teacherId: string) {
  const teacher = await prisma.user.findFirst({
    where: { id: teacherId, tenantId },
    include: { userRoles: { include: { role: { select: { name: true } } } } },
  });
  if (!teacher) return null;
  return teacher.userRoles.some((assignment) => assignment.role.name === 'Teacher' && (!assignment.branchId || assignment.branchId === branchId)) ? teacher : null;
}

async function classConflict(params: {
  tenantId: string;
  branchId: string;
  teacherId: string | null;
  schedule: ScheduleSlot[];
  excludeClassId?: string;
  studentIds?: string[];
}): Promise<string[]> {
  const studentIds = params.studentIds ?? [];
  const conflicts = new Set<string>();
  const otherClasses = await prisma.class.findMany({
    where: {
      ...(params.excludeClassId ? { id: { not: params.excludeClassId } } : {}),
      course: { tenantId: params.tenantId },
      OR: [
        { branchId: params.branchId },
        ...(params.teacherId ? [{ teacherId: params.teacherId }] : []),
        ...(studentIds.length ? [{ enrollments: { some: { studentId: { in: studentIds }, status: { in: ACTIVE_ENROLLMENT_STATUSES } } } }] : []),
      ],
    },
    select: {
      id: true,
      name: true,
      branchId: true,
      teacherId: true,
      schedule: true,
      enrollments: { where: { studentId: { in: studentIds }, status: { in: ACTIVE_ENROLLMENT_STATUSES } }, select: { studentId: true } },
    },
  });
  for (const other of otherClasses) {
    const otherSchedule = normalizeSchedule(other.schedule);
    for (const slot of params.schedule) {
      for (const candidate of otherSchedule) {
        if (!slotsOverlap(slot, candidate)) continue;
        const time = `${slot.day} ${slot.startTime}–${slot.endTime}`;
        if (params.teacherId && other.teacherId === params.teacherId) conflicts.add(`Teacher conflict: already assigned during ${time}.`);
        if (other.branchId === params.branchId && slot.room && candidate.room && slot.room.localeCompare(candidate.room, undefined, { sensitivity: 'accent' }) === 0) {
          conflicts.add(`Room conflict: ${slot.room} is already used by ${other.name} during ${time}.`);
        }
        if (other.enrollments.length) conflicts.add(`Student conflict: ${other.enrollments.length} enrolled student${other.enrollments.length === 1 ? '' : 's'} also attend ${other.name} during ${time}.`);
      }
    }
  }
  return Array.from(conflicts);
}

async function inheritedGradeStudentIds(tenantId: string, branchId: string, gradeId: string | null): Promise<string[]> {
  if (!gradeId) return [];
  const students = await prisma.student.findMany({
    where: {
      gradeId,
      admissionStatus: 'ACTIVE',
      user: { tenantId, status: 'ACTIVE', userRoles: { some: { branchId } } },
    },
    select: { id: true },
  });
  return students.map((student) => student.id);
}

async function studentEnrollmentConflicts(params: {
  tenantId: string;
  studentId: string;
  targetClassId: string;
  targetSchedule: ScheduleSlot[];
  targetBranchId: string;
  studentGradeId: string | null;
}): Promise<string[]> {
  if (!params.targetSchedule.length) return [];
  const existing = await prisma.class.findMany({
    where: {
      id: { not: params.targetClassId },
      course: { tenantId: params.tenantId },
      OR: [
        { enrollments: { some: { studentId: params.studentId, status: { in: ACTIVE_ENROLLMENT_STATUSES } } } },
        ...(params.studentGradeId ? [{ branchId: params.targetBranchId, course: { tenantId: params.tenantId, gradeId: params.studentGradeId } }] : []),
      ],
    },
    select: {
      name: true, schedule: true, course: { select: { name: true } },
    },
  });
  const conflicts = new Set<string>();
  for (const klass of existing) {
    const otherSchedule = normalizeSchedule(klass.schedule);
    for (const target of params.targetSchedule) {
      for (const occupied of otherSchedule) {
        if (!slotsOverlap(target, occupied)) continue;
        conflicts.add(`Student conflict: ${klass.course.name} (${klass.name}) already runs on ${target.day} ${occupied.startTime}–${occupied.endTime}.`);
      }
    }
  }
  return Array.from(conflicts);
}

interface BulkCourseInput {
  name: string;
  gradeId: string | null;
  type: CourseType;
  monthlyBase: number;
  isTaxExempt: boolean;
  description: string | null;
}

function parseOptionalBoolean(record: Record<string, unknown>, key: string, fallback: boolean): ValidationResult<boolean> {
  const value = record[key];
  return value === undefined
    ? { success: true, data: fallback }
    : typeof value === 'boolean'
      ? { success: true, data: value }
      : { success: false, error: `${key} must be a boolean.` };
}

function parseCourseType(record: Record<string, unknown>, key: string, required: boolean, fallback?: CourseType): ValidationResult<CourseType | undefined> {
  const value = record[key];
  if (value === undefined && !required) return { success: true, data: fallback };
  if (typeof value !== 'string' || !COURSE_TYPES.has(value)) {
    return { success: false, error: `${key} must be a valid course type.` };
  }
  return { success: true, data: value as CourseType };
}

function parseFeeStructure(value: unknown): ValidationResult<{ monthlyBase: number }> {
  const shape = parseStrictKeys(value, ['monthlyBase']);
  if (!shape.success) return shape;
  const monthlyBase = readFiniteNumber(shape.data, 'monthlyBase', { min: 0, max: 100_000_000, message: 'feeStructure.monthlyBase must be a non-negative finite number.' });
  return monthlyBase.success ? { success: true, data: { monthlyBase: monthlyBase.data } } : monthlyBase;
}


function parseBulkCourses(body: unknown): ValidationResult<{ branchId: string; items: BulkCourseInput[] }> {
  const request = parseStrictKeys(body, ['branchId', 'items']);
  if (!request.success) return request;
  const branchId = readTrimmedString(request.data, 'branchId', { required: true, maxLength: 128, message: 'A valid branchId is required.' });
  if (!branchId.success) return branchId;
  if (!Array.isArray(request.data.items) || request.data.items.length === 0 || request.data.items.length > 500) {
    return { success: false, error: 'items must contain between 1 and 500 courses.' };
  }
  const items: BulkCourseInput[] = [];
  for (const [index, item] of request.data.items.entries()) {
    const shape = parseStrictKeys(item, ['name', 'gradeId', 'type', 'monthlyBase', 'isTaxExempt', 'description']);
    if (!shape.success) return { success: false, error: `Item ${index + 1}: ${shape.error}` };
    const name = readTrimmedString(shape.data, 'name', { maxLength: 160, message: 'Course name must be a string of 160 characters or fewer.' });
    const type = parseCourseType(shape.data, 'type', false, CourseType.REGULAR);
    const monthlyBase = readFiniteNumber(shape.data, 'monthlyBase', { min: 0, max: 100_000_000, message: 'monthlyBase must be a non-negative finite number.' });
    const isTaxExempt = parseOptionalBoolean(shape.data, 'isTaxExempt', false);
    const description = readTrimmedString(shape.data, 'description', { maxLength: 2_000, message: 'description must be 2000 characters or fewer.' });
    const gradeId = shape.data.gradeId;
    if (!name.success) return { success: false, error: `Item ${index + 1}: ${name.error}` };
    if (!type.success) return { success: false, error: `Item ${index + 1}: ${type.error}` };
    if (!monthlyBase.success) return { success: false, error: `Item ${index + 1}: ${monthlyBase.error}` };
    if (!isTaxExempt.success) return { success: false, error: `Item ${index + 1}: ${isTaxExempt.error}` };
    if (!description.success) return { success: false, error: `Item ${index + 1}: ${description.error}` };
    if (gradeId !== undefined && gradeId !== null && (typeof gradeId !== 'string' || !gradeId.trim() || gradeId.length > 128)) return { success: false, error: `Item ${index + 1}: gradeId must be a valid ID or null.` };
    items.push({ name: name.data, gradeId: typeof gradeId === 'string' ? gradeId.trim() : null, type: type.data!, monthlyBase: monthlyBase.data, isTaxExempt: isTaxExempt.data, description: description.data || null });
  }
  return { success: true, data: { branchId: branchId.data, items } };
}

function parseEnrollmentIds(body: unknown, additional: readonly string[] = []) {
  const shape = parseStrictKeys(body, ['studentId', 'courseId', ...additional]);
  if (!shape.success) return shape;
  const studentId = readTrimmedString(shape.data, 'studentId', { required: true, maxLength: 128, message: 'A valid studentId is required.' });
  const courseId = readTrimmedString(shape.data, 'courseId', { required: true, maxLength: 128, message: 'A valid courseId is required.' });
  if (!studentId.success) return studentId;
  if (!courseId.success) return courseId;
  return { success: true as const, data: { shape: shape.data, studentId: studentId.data, courseId: courseId.data } };
}

// 1. Create a new Course (Tenant Admin/Branch Admin)
router.post(
  '/',
  authMiddleware,
  hasPermission('manage_courses'),
  async (req: TenantRequest, res: Response) => {
    const shape = parseStrictKeys(req.body, ['branchId', 'gradeId', 'name', 'description', 'type', 'feeStructure', 'isTaxExempt', 'taxPercentage', 'isExtraActivity']);
    if (!shape.success) return res.status(400).json({ error: shape.error });
    const branchId = readTrimmedString(shape.data, 'branchId', { required: true, maxLength: 128, message: 'A valid branchId is required.' });
    const name = readTrimmedString(shape.data, 'name', { required: true, maxLength: 160, message: 'A course name is required and must be 160 characters or fewer.' });
    const type = parseCourseType(shape.data, 'type', true);
    const feeStructure = parseFeeStructure(shape.data.feeStructure);
    if (!branchId.success) return res.status(400).json({ error: branchId.error });
    if (!name.success) return res.status(400).json({ error: name.error });
    if (!type.success) return res.status(400).json({ error: type.error });
    if (!feeStructure.success) return res.status(400).json({ error: feeStructure.error });
    const gradeIdValue = shape.data.gradeId;
    if (gradeIdValue !== undefined && gradeIdValue !== null && (typeof gradeIdValue !== 'string' || !gradeIdValue.trim() || gradeIdValue.length > 128)) {
      return res.status(400).json({ error: 'gradeId must be a valid ID or null.' });
    }
    const gradeId = typeof gradeIdValue === 'string' ? gradeIdValue.trim() : null;
    const descriptionValue = shape.data.description;
    if (descriptionValue !== undefined && descriptionValue !== null && (typeof descriptionValue !== 'string' || descriptionValue.trim().length > 2_000)) {
      return res.status(400).json({ error: 'description must be a string of 2000 characters or fewer, or null.' });
    }
    const description = typeof descriptionValue === 'string' ? descriptionValue.trim() || null : null;
    const isTaxExempt = parseOptionalBoolean(shape.data, 'isTaxExempt', false);
    const isExtraActivity = parseOptionalBoolean(shape.data, 'isExtraActivity', false);
    if (!isTaxExempt.success) return res.status(400).json({ error: isTaxExempt.error });
    if (!isExtraActivity.success) return res.status(400).json({ error: isExtraActivity.error });
    const taxPercentage = shape.data.taxPercentage === undefined ? 13 : readFiniteNumber(shape.data, 'taxPercentage', { min: 0, max: 100, message: 'taxPercentage must be between 0 and 100.' });
    if (typeof taxPercentage !== 'number' && !taxPercentage.success) return res.status(400).json({ error: taxPercentage.error });

    try {
      // Branch must belong to the caller's tenant.
      const branch = await prisma.branch.findUnique({ where: { id: branchId.data } });
      if (!branch || branch.tenantId !== req.tenantId) {
        return res.status(404).json({ error: 'Branch not found in your institution.' });
      }

      // Optional grade must belong to the tenant.
      let resolvedGrade: { id: string; billingMode: GradeBillingMode } | null = null;
      if (gradeId) {
        const grade = await prisma.grade.findFirst({ where: { id: gradeId, tenantId: req.tenantId! }, select: { id: true, billingMode: true } });
        if (!grade) {
          return res.status(404).json({ error: 'Grade not found in your institution.' });
        }
        resolvedGrade = grade;
      }

      const resolvedIsExtraActivity = type.data !== CourseType.REGULAR || isExtraActivity.data;
      const includedInGradePackage = type.data === CourseType.REGULAR && !resolvedIsExtraActivity && resolvedGrade?.billingMode === GradeBillingMode.GRADE;

      const course = await prisma.course.create({
        data: {
          tenantId: req.tenantId!, branchId: branchId.data,
          gradeId: resolvedGrade?.id ?? null,
          name: name.data,
          description,
          type: type.data!, feeStructure: includedInGradePackage ? { monthlyBase: 0 } : feeStructure.data,
          isExtraActivity: resolvedIsExtraActivity, isTaxExempt: isTaxExempt.data,
          taxPercentage: typeof taxPercentage === 'number' ? taxPercentage : taxPercentage.data,
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
    const input = parseBulkCourses(req.body);
    if (!input.success) return res.status(400).json({ error: input.error });
    const { branchId, items } = input.data;

    try {
      const branch = await prisma.branch.findUnique({ where: { id: branchId } });
      if (!branch || branch.tenantId !== req.tenantId) {
        return res.status(404).json({ error: 'Branch not found in your institution.' });
      }

      const grades = await prisma.grade.findMany({ where: { tenantId: req.tenantId! }, select: { id: true, billingMode: true } });
      const gradeModes = new Map(grades.map((g) => [g.id, g.billingMode]));

      const existing = await prisma.course.findMany({
        where: { tenantId: req.tenantId!, branchId },
        select: { name: true, gradeId: true },
      });
      const seen = new Set(existing.map((c) => `${c.gradeId ?? ''}::${c.name.toLowerCase()}`));

      const results: Array<{ index: number; name: string; status: 'created' | 'skipped' | 'error'; error?: string }> = [];
      let created = 0;
      for (const [index, item] of items.entries()) {
        const { name, gradeId, monthlyBase: fee } = item;
        if (!name) {
          results.push({ index, name, status: 'error', error: 'Course name is required.' });
          continue;
        }
        if (gradeId && !gradeModes.has(gradeId)) {
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
            description: item.description,
            type: item.type,
            feeStructure: { monthlyBase: gradeId && gradeModes.get(gradeId) === 'GRADE' && item.type === 'REGULAR' ? 0 : fee },
            isTaxExempt: item.isTaxExempt,
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
        where: { tenantId: req.tenantId!, ...(isTenantAdmin(req.user!) ? {} : { branchId: { in: req.user!.roles.filter((role: { roleName: string; branchId: string | null }) => role.roleName === 'Branch Admin' && role.branchId).map((role: { roleName: string; branchId: string | null }) => role.branchId as string) } }) },
        orderBy: { createdAt: 'desc' },
        include: {
          branch: { select: { name: true } },
          grade: { select: { id: true, name: true, billingMode: true } },
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
          gradeBillingMode: c.grade?.billingMode ?? null,
          feeStructure: c.feeStructure,
          isTaxExempt: c.isTaxExempt,
          isExtraActivity: c.isExtraActivity,
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
        where: { course: { tenantId: req.tenantId! }, ...(isTenantAdmin(req.user!) ? {} : { branchId: { in: req.user!.roles.filter((role: { roleName: string; branchId: string | null }) => role.roleName === 'Branch Admin' && role.branchId).map((role: { roleName: string; branchId: string | null }) => role.branchId as string) } }) },
        orderBy: { createdAt: 'desc' },
        include: {
          course: { select: { name: true, type: true, feeStructure: true, isTaxExempt: true, taxPercentage: true, grade: { select: { id: true, name: true, billingMode: true } } } },
          branch: { select: { name: true } },
          assignedTeacher: { select: { id: true, firstName: true, lastName: true } },
          enrollments: { where: { status: { in: ['ACTIVE', 'BLOCKED'] } }, include: { student: { include: { user: { select: { firstName: true, lastName: true, email: true } } } } }, orderBy: { student: { user: { firstName: 'asc' } } } },
          _count: { select: { enrollments: true, sessions: true } },
        },
      });
      return res.json({
        classes: classes.map((c) => ({
          id: c.id,
          name: c.name,
          schedule: normalizeSchedule(c.schedule),
          courseId: c.courseId,
          courseName: c.course.name,
          courseType: c.course.type,
          feeStructure: c.course.feeStructure,
          isTaxExempt: c.course.isTaxExempt,
          taxPercentage: Number(c.course.taxPercentage),
          // Grade is derived from the course — the class inherits it automatically.
          gradeId: c.course.grade?.id ?? null,
          gradeName: c.course.grade?.name ?? null,
          gradeBillingMode: c.course.grade?.billingMode ?? null,
          branchId: c.branchId,
          branchName: c.branch.name,
          teacherId: c.teacherId,
          teacherName: c.assignedTeacher ? `${c.assignedTeacher.firstName} ${c.assignedTeacher.lastName}` : null,
          academicYear: c.academicYear,
          effectiveFrom: c.effectiveFrom,
          effectiveUntil: c.effectiveUntil,
          enrollmentCount: c._count.enrollments,
          enrollments: c.enrollments.map((enrollment) => ({ id: enrollment.id, studentId: enrollment.studentId, status: enrollment.status, studentName: `${enrollment.student.user.firstName} ${enrollment.student.user.lastName}`.trim(), studentEmail: enrollment.student.user.email })),
          sessionCount: c._count.sessions,
          createdAt: c.createdAt,
        })),
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to list classes.', details: error.message });
    }
  }
);

router.get('/classes/:classId/versions', authMiddleware, async (req: TenantRequest, res: Response) => {
  const klass = await prisma.class.findFirst({ where: { id: req.params.classId, course: { tenantId: req.tenantId! } } });
  if (!klass) return res.status(404).json({ error: 'Class not found in your institution.' });
  if (!canAccessBranch(req.user!, klass.branchId)) return res.status(403).json({ error: 'You cannot view timetable history for this branch.' });
  const versions = await prisma.timetableVersion.findMany({ where: { classId: klass.id }, orderBy: { version: 'desc' } });
  return res.json({ versions: versions.map((version) => ({ ...version, schedule: normalizeSchedule(version.schedule) })) });
});

// Students who can be assigned to a class, restricted to its tenant, branch,
// and configured grade. Grade-based admissions do not create class enrolments
// until an admin assigns the student to a concrete section.
router.get('/classes/:id/eligible-students', authMiddleware, async (req: TenantRequest, res: Response) => {
  try {
    const klass = await prisma.class.findFirst({
      where: { id: req.params.id, course: { tenantId: req.tenantId! } },
      include: { course: { select: { gradeId: true } }, enrollments: { where: { status: { in: ACTIVE_ENROLLMENT_STATUSES } }, select: { studentId: true } } },
    });
    if (!klass) return res.status(404).json({ error: 'Class not found in your institution.' });
    if (!canAccessBranch(req.user!, klass.branchId)) return res.status(403).json({ error: 'You cannot manage students for this branch.' });
    if (!klass.course.gradeId) return res.json({ students: [] });
    const enrolledIds = klass.enrollments.map((item) => item.studentId);
    const students = await prisma.student.findMany({
      where: {
        gradeId: klass.course.gradeId,
        admissionStatus: 'ACTIVE',
        id: enrolledIds.length ? { notIn: enrolledIds } : undefined,
        user: { tenantId: req.tenantId!, status: 'ACTIVE', userRoles: { some: { branchId: klass.branchId } } },
      },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { user: { firstName: 'asc' } },
    });
    return res.json({ students: students.map((student) => ({ studentId: student.id, studentName: `${student.user.firstName} ${student.user.lastName}`.trim(), studentEmail: student.user.email })) });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to load eligible students.', details: error.message });
  }
});

// 3. Enroll a Student and Auto-Generate Initial Invoice (Accounting/Admin)
router.post(
  '/enroll',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const input = parseEnrollmentIds(req.body, ['classId', 'admissionDate']);
    if (!input.success) return res.status(400).json({ error: input.error });
    const { studentId, courseId } = input.data;
    const classId = readTrimmedString(input.data.shape, 'classId', { required: true, maxLength: 128, message: 'A valid classId is required.' });
    const admissionDate = readTrimmedString(input.data.shape, 'admissionDate', { required: false, maxLength: 40, message: 'admissionDate must be a valid date.' });
    if (!classId.success) return res.status(400).json({ error: classId.error });
    if (!admissionDate.success || (admissionDate.data && Number.isNaN(new Date(admissionDate.data).getTime()))) return res.status(400).json({ error: 'admissionDate must be a valid date.' });

    try {
      // 1. Fetch course and verify it belongs to the caller's tenant.
      const course = await prisma.course.findUnique({ where: { id: courseId }, include: { grade: { select: { billingMode: true } } } });
      if (!course || course.tenantId !== req.tenantId) {
        return res.status(404).json({ error: 'Course not found in your institution.' });
      }
      if (!canAccessBranch(req.user!, course.branchId)) {
        return res.status(403).json({ error: 'Only the Tenant Admin or assigned Branch Admin may enroll this student.' });
      }

      // The student and class must also belong to the tenant.
      const [student, klass] = await Promise.all([
        prisma.student.findFirst({
          where: { id: studentId, user: { tenantId: req.tenantId! } },
          include: { grade: { select: { name: true } }, user: { select: { status: true } } },
        }),
        prisma.class.findFirst({ where: { id: classId.data, course: { tenantId: req.tenantId! } } }),
      ]);
      if (!student) {
        return res.status(404).json({ error: 'Student not found in your institution.' });
      }
      if (student.admissionStatus !== 'ACTIVE' || student.user.status !== 'ACTIVE') {
        return res.status(409).json({ error: 'Admission payment and login issuance must be completed before enrollment.' });
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
      const dup = await prisma.enrollment.findFirst({ where: { studentId, classId: classId.data, status: { in: ACTIVE_ENROLLMENT_STATUSES } } });
      if (dup) {
        return res.status(409).json({ error: 'Student is already enrolled in this class.' });
      }

      const timetableConflicts = await studentEnrollmentConflicts({
        tenantId: req.tenantId!,
        studentId,
        targetClassId: klass.id,
        targetSchedule: normalizeSchedule(klass.schedule),
        targetBranchId: klass.branchId,
        studentGradeId: student.gradeId,
      });
      if (timetableConflicts.length) {
        return res.status(409).json({ error: timetableConflicts[0], conflicts: timetableConflicts });
      }

      // Create the enrolment only. Billing is the monthly run (grade tuition +
      // active extra-activity enrolments) — no per-enrolment invoice here.
      const enrollment = await prisma.enrollment.create({
        data: {
          studentId,
          courseId,
          classId: classId.data,
          status: 'ACTIVE',
          admissionDate: admissionDate.data ? new Date(admissionDate.data) : new Date(),
        },
      });

      const feeStructure = (course.feeStructure ?? {}) as { monthlyBase?: number };
      const base = Number(feeStructure.monthlyBase || 0);
      const isRecurringCharge = recurringInvoiceType(course.grade?.billingMode ?? 'GRADE', course.isExtraActivity);
      const monthlyDelta = isRecurringCharge ? (course.isTaxExempt ? base : base * (1 + Number(course.taxPercentage || 13) / 100)) : 0;

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

// Live conflict check used by the shared Tenant/Branch Admin timetable editor.
router.post(
  '/classes/conflicts',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const shape = parseStrictKeys(req.body, ['courseId', 'classId', 'teacherId', 'schedule']);
    if (!shape.success) return res.status(400).json({ error: shape.error });
    const courseId = readTrimmedString(shape.data, 'courseId', { required: true, maxLength: 128, message: 'A valid courseId is required.' });
    const classId = readTrimmedString(shape.data, 'classId', { required: false, maxLength: 128, message: 'classId must be valid.' });
    const schedule = parseSchedule(shape.data.schedule);
    if (!courseId.success) return res.status(400).json({ error: courseId.error });
    if (!classId.success) return res.status(400).json({ error: classId.error });
    if (!schedule.success) return res.status(400).json({ error: schedule.error });
    const teacherIdValue = shape.data.teacherId;
    if (teacherIdValue !== undefined && teacherIdValue !== null && (typeof teacherIdValue !== 'string' || !teacherIdValue.trim() || teacherIdValue.length > 128)) {
      return res.status(400).json({ error: 'teacherId must be a valid ID or null.' });
    }
    const teacherId = typeof teacherIdValue === 'string' ? teacherIdValue.trim() : null;
    try {
      const course = await prisma.course.findFirst({ where: { id: courseId.data, tenantId: req.tenantId! } });
      if (!course) return res.status(404).json({ error: 'Course not found in your institution.' });
      if (!hasBranchPermission(req.user!, 'manage_courses', course.branchId)) return res.status(403).json({ error: 'You cannot schedule classes for this branch.' });
      if (teacherId && !await eligibleTeacher(req.tenantId!, course.branchId, teacherId)) return res.status(400).json({ error: 'Selected teacher is not assigned to this branch.' });
      let studentIds: string[] = [];
      if (classId.data) {
        const klass = await prisma.class.findFirst({
          where: { id: classId.data, courseId: course.id, branchId: course.branchId },
          select: { course: { select: { gradeId: true } }, enrollments: { where: { status: { in: ACTIVE_ENROLLMENT_STATUSES } }, select: { studentId: true } } },
        });
        if (!klass) return res.status(404).json({ error: 'Class not found for the selected course.' });
        studentIds = [...new Set([...klass.enrollments.map((enrollment) => enrollment.studentId), ...await inheritedGradeStudentIds(req.tenantId!, course.branchId, klass.course.gradeId)])];
      }
      else studentIds = await inheritedGradeStudentIds(req.tenantId!, course.branchId, course.gradeId);
      const conflicts = await classConflict({ tenantId: req.tenantId!, branchId: course.branchId, teacherId, schedule: schedule.data, excludeClassId: classId.data || undefined, studentIds });
      return res.json({ conflicts });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to check timetable conflicts.', details: error.message });
    }
  },
);

// 4. Create a Class (Timetable Instance)
router.post(
  '/classes',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const shape = parseStrictKeys(req.body, ['courseId', 'name', 'schedule', 'teacherId', 'academicYear', 'effectiveFrom', 'effectiveUntil']);
    if (!shape.success) return res.status(400).json({ error: shape.error });
    const courseId = readTrimmedString(shape.data, 'courseId', { required: true, maxLength: 128, message: 'A valid courseId is required.' });
    const name = readTrimmedString(shape.data, 'name', { required: true, maxLength: 160, message: 'A class name is required and must be 160 characters or fewer.' });
    const schedule = parseSchedule(shape.data.schedule);
    if (!courseId.success) return res.status(400).json({ error: courseId.error });
    if (!name.success) return res.status(400).json({ error: name.error });
    if (!schedule.success) return res.status(400).json({ error: schedule.error });
    const teacherIdValue = shape.data.teacherId;
    if (teacherIdValue !== undefined && teacherIdValue !== null && (typeof teacherIdValue !== 'string' || !teacherIdValue.trim() || teacherIdValue.length > 128)) {
      return res.status(400).json({ error: 'teacherId must be a valid ID or null.' });
    }
    const teacherId = typeof teacherIdValue === 'string' ? teacherIdValue.trim() : null;
    const academicYear = readTrimmedString(shape.data, 'academicYear', { required: false, maxLength: 40, message: 'academicYear must be 40 characters or fewer.' });
    if (!academicYear.success) return res.status(400).json({ error: academicYear.error });
    const effectiveFrom = shape.data.effectiveFrom ? new Date(String(shape.data.effectiveFrom)) : null;
    const effectiveUntil = shape.data.effectiveUntil ? new Date(String(shape.data.effectiveUntil)) : null;
    if ((effectiveFrom && Number.isNaN(effectiveFrom.getTime())) || (effectiveUntil && Number.isNaN(effectiveUntil.getTime())) || (effectiveFrom && effectiveUntil && effectiveFrom > effectiveUntil)) {
      return res.status(400).json({ error: 'Effective dates must be valid and effectiveUntil cannot precede effectiveFrom.' });
    }

    try {
      // The class inherits the course's branch; verify both belong to the tenant.
      const course = await prisma.course.findUnique({ where: { id: courseId.data } });
      if (!course || course.tenantId !== req.tenantId) {
        return res.status(404).json({ error: 'Course not found in your institution.' });
      }
      if (!hasBranchPermission(req.user!, 'manage_courses', course.branchId)) {
        return res.status(403).json({ error: 'You cannot create classes for this branch.' });
      }
      if (teacherId && !await eligibleTeacher(req.tenantId!, course.branchId, teacherId)) {
        return res.status(400).json({ error: 'Selected teacher is not assigned to this branch.' });
      }
      const inheritedStudentIds = await inheritedGradeStudentIds(req.tenantId!, course.branchId, course.gradeId);
      const conflicts = await classConflict({ tenantId: req.tenantId!, branchId: course.branchId, teacherId, schedule: schedule.data, studentIds: inheritedStudentIds });
      if (conflicts.length) return res.status(409).json({ error: conflicts[0], conflicts });

      const cls = await prisma.class.create({
        data: {
          courseId: courseId.data,
          branchId: course.branchId,
          name: name.data,
          schedule: schedule.data as unknown as Prisma.InputJsonValue,
          teacherId,
          academicYear: academicYear.data,
          effectiveFrom,
          effectiveUntil,
        },
      });
      await prisma.timetableVersion.create({ data: {
        classId: cls.id, version: 1, academicYear: cls.academicYear,
        effectiveFrom: cls.effectiveFrom, effectiveUntil: cls.effectiveUntil,
        teacherId: cls.teacherId, name: cls.name, schedule: cls.schedule as Prisma.InputJsonValue,
        changedBy: req.user!.id,
      } });
      if (teacherId) await ensureTodaySession(teacherId, cls.id, cls.schedule);
      return res.status(201).json({ message: 'Class timetable created successfully.', class: cls });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to create class.', details: error.message });
    }
  }
);

// 4b. Weekday abbreviations used in class schedules.
const DAY_ABBR = SCHEDULE_DAYS;

// Ensure a TeacherSession exists for the assigned teacher on today's date when
// the class is scheduled today. This is the per-day session generation that a
// cron would normally run; triggering it on assignment makes the teacher portal
// populate immediately.
async function ensureTodaySession(teacherId: string, classId: string, schedule: any): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayAbbr = DAY_ABBR[today.getDay()];
  const scheduledToday = normalizeSchedule(schedule).some((slot) => slot.day === todayAbbr);
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
  async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    const shape = parseStrictKeys(req.body, ['name', 'schedule', 'teacherId', 'academicYear', 'effectiveFrom', 'effectiveUntil']);
    if (!shape.success) return res.status(400).json({ error: shape.error });

    const data: Prisma.ClassUncheckedUpdateInput = {};
    if (shape.data.name !== undefined) {
      const name = readTrimmedString(shape.data, 'name', { required: true, maxLength: 160, message: 'name must be a non-empty string of 160 characters or fewer.' });
      if (!name.success) return res.status(400).json({ error: name.error });
      data.name = name.data;
    }
    if (shape.data.schedule !== undefined) {
      const schedule = parseSchedule(shape.data.schedule);
      if (!schedule.success) return res.status(400).json({ error: schedule.error });
      data.schedule = schedule.data as unknown as Prisma.InputJsonValue;
    }
    const teacherIdValue = shape.data.teacherId;
    if (teacherIdValue !== undefined) {
      if (teacherIdValue !== null && (typeof teacherIdValue !== 'string' || !teacherIdValue.trim() || teacherIdValue.length > 128)) {
        return res.status(400).json({ error: 'teacherId must be a valid ID or null.' });
      }
      data.teacherId = typeof teacherIdValue === 'string' ? teacherIdValue.trim() : null;
    }
    if (shape.data.academicYear !== undefined) {
      const academicYear = readTrimmedString(shape.data, 'academicYear', { required: false, maxLength: 40, message: 'academicYear must be 40 characters or fewer.' });
      if (!academicYear.success) return res.status(400).json({ error: academicYear.error });
      data.academicYear = academicYear.data;
    }
    for (const field of ['effectiveFrom', 'effectiveUntil'] as const) {
      if (shape.data[field] === undefined) continue;
      if (shape.data[field] === null || shape.data[field] === '') data[field] = null;
      else {
        const parsed = new Date(String(shape.data[field]));
        if (Number.isNaN(parsed.getTime())) return res.status(400).json({ error: `${field} must be a valid date or null.` });
        data[field] = parsed;
      }
    }
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'At least one class field must be provided.' });
    }

    try {
      const cls = await prisma.class.findUnique({
        where: { id },
        include: { course: true, enrollments: { where: { status: { in: ACTIVE_ENROLLMENT_STATUSES } }, select: { studentId: true } } },
      });
      if (!cls || cls.course.tenantId !== req.tenantId) {
        return res.status(404).json({ error: 'Class not found in your institution.' });
      }
      if (!hasBranchPermission(req.user!, 'manage_courses', cls.branchId)) {
        return res.status(403).json({ error: 'You cannot update classes for this branch.' });
      }

      const nextTeacherId = data.teacherId === undefined ? cls.teacherId : typeof data.teacherId === 'string' ? data.teacherId : null;
      const nextSchedule = normalizeSchedule(data.schedule ?? cls.schedule);
      if (nextTeacherId && !await eligibleTeacher(req.tenantId!, cls.branchId, nextTeacherId)) {
        return res.status(400).json({ error: 'Selected teacher is not assigned to this branch.' });
      }
      if (shape.data.schedule !== undefined || teacherIdValue !== undefined) {
        const conflicts = await classConflict({
          tenantId: req.tenantId!,
          branchId: cls.branchId,
          teacherId: nextTeacherId,
          schedule: nextSchedule,
          excludeClassId: cls.id,
          studentIds: [...new Set([
            ...cls.enrollments.map((enrollment) => enrollment.studentId),
            ...await inheritedGradeStudentIds(req.tenantId!, cls.branchId, cls.course.gradeId),
          ])],
        });
        if (conflicts.length) return res.status(409).json({ error: conflicts[0], conflicts });
      }

      const nextFrom = data.effectiveFrom === undefined ? cls.effectiveFrom : data.effectiveFrom as Date | null;
      const nextUntil = data.effectiveUntil === undefined ? cls.effectiveUntil : data.effectiveUntil as Date | null;
      if (nextFrom && nextUntil && nextFrom > nextUntil) return res.status(400).json({ error: 'effectiveUntil cannot precede effectiveFrom.' });
      const latestVersion = await prisma.timetableVersion.aggregate({ where: { classId: cls.id }, _max: { version: true } });
      const updated = await prisma.$transaction(async (tx) => {
        const saved = await tx.class.update({ where: { id }, data });
        await tx.timetableVersion.create({ data: {
          classId: saved.id, version: (latestVersion._max.version ?? 0) + 1,
          academicYear: saved.academicYear, effectiveFrom: saved.effectiveFrom, effectiveUntil: saved.effectiveUntil,
          teacherId: saved.teacherId, name: saved.name, schedule: saved.schedule as Prisma.InputJsonValue,
          changedBy: req.user!.id,
        } });
        return saved;
      });

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
      if (!hasBranchPermission(req.user!, 'manage_courses', cls.branchId)) {
        return res.status(403).json({ error: 'You cannot delete classes for this branch.' });
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
      const cls = await prisma.class.findFirst({ where: { id: classId, course: { tenantId: req.tenantId! } } });
      if (!cls) {
        return res.status(404).json({ error: 'Class not found.' });
      }
      const hasBranchMembership = req.user!.roles.some((role: any) => role.branchId === cls.branchId);
      if (!isTenantAdmin(req.user!) && !hasBranchMembership) {
        return res.status(403).json({ error: 'You cannot view classes for this branch.' });
      }
      return res.json({ class: { ...cls, schedule: normalizeSchedule(cls.schedule) } });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to load class.' });
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
      const student = await prisma.student.findFirst({
        where: { id: studentId, user: { tenantId: req.tenantId! } },
        include: {
          user: { include: { userRoles: true } },
          studentParents: { include: { parent: true } },
        },
      });
      if (!student) return res.status(404).json({ error: 'Student not found in your institution.' });
      const branchIds = student.user.userRoles
        .map((assignment) => assignment.branchId)
        .filter((branchId): branchId is string => Boolean(branchId));
      const allowed = student.userId === req.user!.id
        || student.studentParents.some((link) => link.parent.userId === req.user!.id)
        || isTenantAdmin(req.user!)
        || branchIds.some((branchId) => canAccessBranch(req.user!, branchId));
      if (!allowed) return res.status(403).json({ error: 'You cannot view this student timetable.' });
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId, status: 'ACTIVE', student: { user: { tenantId: req.tenantId! } } },
        include: { class: true },
      });
      const timetable = enrollments.map(e => ({
        classId: e.classId,
        className: e.class.name,
        courseId: e.courseId,
        schedule: normalizeSchedule(e.class.schedule),
      }));
      return res.json({ timetable });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to load student timetable.' });
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
      const teacher = await prisma.user.findFirst({
        where: { id: teacherId, tenantId: req.tenantId!, userRoles: { some: { role: { name: 'Teacher' } } } },
        include: { userRoles: true },
      });
      if (!teacher) return res.status(404).json({ error: 'Teacher not found in your institution.' });
      const branchIds = teacher.userRoles
        .map((assignment) => assignment.branchId)
        .filter((branchId): branchId is string => Boolean(branchId));
      const allowed = teacher.id === req.user!.id
        || isTenantAdmin(req.user!)
        || branchIds.some((branchId) => canAccessBranch(req.user!, branchId));
      if (!allowed) return res.status(403).json({ error: 'You cannot view this teacher timetable.' });
      const classes = await prisma.class.findMany({
        where: { teacherId, course: { tenantId: req.tenantId! } },
        orderBy: { name: 'asc' },
      });
      const timetable = classes.map(c => ({
        classId: c.id,
        className: c.name,
        courseId: c.courseId,
        schedule: normalizeSchedule(c.schedule),
        academicYear: c.academicYear,
        effectiveFrom: c.effectiveFrom,
        effectiveUntil: c.effectiveUntil,
      }));
      return res.json({ timetable });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to load teacher timetable.' });
    }
  }
);

// 8. Block Student Enrollment
router.post(
  '/billing/block',
  authMiddleware,
  hasPermission('manage_billing'),
  async (req: TenantRequest, res: Response) => {
    const input = parseEnrollmentIds(req.body);
    if (!input.success) return res.status(400).json({ error: input.error });
    const { studentId, courseId } = input.data;
    try {
      const [student, course] = await Promise.all([
        prisma.student.findFirst({ where: { id: studentId, user: { tenantId: req.tenantId! } } }),
        prisma.course.findFirst({ where: { id: courseId, tenantId: req.tenantId! } }),
      ]);
      if (!student || !course) return res.status(404).json({ error: 'Student or course not found in your institution.' });
      if (!canAccessBranch(req.user!, course.branchId)) {
        return res.status(403).json({ error: 'You cannot manage billing for this course branch.' });
      }
      const transition = await prisma.enrollment.updateMany({
        where: {
          studentId,
          courseId,
          status: 'ACTIVE',
          student: { user: { tenantId: req.tenantId! } },
          course: { tenantId: req.tenantId! },
        },
        data: { status: 'BLOCKED' },
      });
      if (transition.count === 0) return res.status(404).json({ error: 'Active enrollment not found.' });
      return res.json({ message: 'Student enrollment successfully blocked due to unpaid dues.' });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to block enrollment.' });
    }
  }
);

// 9. Override Blocked Student Enrollment (Admin override)
router.post(
  '/billing/override',
  authMiddleware,
  hasPermission('manage_billing'),
  async (req: TenantRequest, res: Response) => {
    const input = parseEnrollmentIds(req.body, ['reason']);
    if (!input.success) return res.status(400).json({ error: input.error });
    const { studentId, courseId } = input.data;
    const reason = readTrimmedString(input.data.shape, 'reason', { required: true, maxLength: 2_000, message: 'An override reason is required.' });
    if (!reason.success) return res.status(400).json({ error: reason.error });
    try {
      const [student, course] = await Promise.all([
        prisma.student.findFirst({ where: { id: studentId, user: { tenantId: req.tenantId! } } }),
        prisma.course.findFirst({ where: { id: courseId, tenantId: req.tenantId! } }),
      ]);
      if (!student || !course) return res.status(404).json({ error: 'Student or course not found in your institution.' });
      if (!canAccessBranch(req.user!, course.branchId)) {
        return res.status(403).json({ error: 'You cannot manage billing for this course branch.' });
      }
      const transition = await prisma.enrollment.updateMany({
        where: {
          studentId,
          courseId,
          status: 'BLOCKED',
          student: { user: { tenantId: req.tenantId! } },
          course: { tenantId: req.tenantId! },
        },
        data: { status: 'ACTIVE' },
      });
      if (transition.count === 0) return res.status(404).json({ error: 'Blocked enrollment not found.' });
      
      return res.json({
        message: 'Admin override processed successfully. Student access unblocked.',
        reason: reason.data,
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to override enrollment block.' });
    }
  }
);

// 8. Specialized Enrollments (Music, Short-term, Long-term)
router.post(
  '/enroll/special',
  authMiddleware,
  hasPermission('manage_courses'),
  async (req: TenantRequest, res: Response) => {
    const input = parseEnrollmentIds(req.body, ['classId', 'type', 'customFeeSettings']);
    if (!input.success) return res.status(400).json({ error: input.error });
    const { studentId, courseId } = input.data;
    const classId = readTrimmedString(input.data.shape, 'classId', { required: true, maxLength: 128, message: 'A valid classId is required.' });
    const type = readTrimmedString(input.data.shape, 'type', { required: true, maxLength: 20, pattern: /^(MUSIC|SHORT_TERM|LONG_TERM|PERSONALIZED)$/, message: 'A valid specialized enrollment type is required.' });
    const customFeeSettings: ValidationResult<Record<string, unknown>> = input.data.shape.customFeeSettings === undefined
      ? { success: true, data: {} }
      : parsePlainRecord(input.data.shape.customFeeSettings);
    if (!classId.success) return res.status(400).json({ error: classId.error });
    if (!type.success) return res.status(400).json({ error: type.error });
    if (!customFeeSettings.success) return res.status(400).json({ error: 'customFeeSettings must be a JSON object.' });

    try {
      const [student, course, klass] = await Promise.all([
        prisma.student.findFirst({
          where: { id: studentId, user: { tenantId: req.tenantId!, status: 'ACTIVE' }, admissionStatus: 'ACTIVE' },
        }),
        prisma.course.findFirst({ where: { id: courseId, tenantId: req.tenantId! } }),
         prisma.class.findFirst({ where: { id: classId.data, course: { tenantId: req.tenantId! } } }),
      ]);
      if (!student || !course || !klass) {
        return res.status(404).json({ error: 'Student, course, or class not found in your institution.' });
      }
      if (klass.courseId !== course.id) return res.status(400).json({ error: 'The selected class does not belong to this course.' });
      if (!canAccessBranch(req.user!, course.branchId)) {
        return res.status(403).json({ error: 'You cannot enroll students in this course branch.' });
      }
       if (course.type !== type.data) {
        return res.status(400).json({ error: 'Enrollment type must match the specialized course type.' });
      }
       const duplicate = await prisma.enrollment.findFirst({ where: { studentId, classId: classId.data, status: { in: ACTIVE_ENROLLMENT_STATUSES } } });
      if (duplicate) return res.status(409).json({ error: 'Student is already enrolled in this class.' });
      const timetableConflicts = await studentEnrollmentConflicts({
        tenantId: req.tenantId!,
        studentId,
        targetClassId: klass.id,
        targetSchedule: normalizeSchedule(klass.schedule),
        targetBranchId: klass.branchId,
        studentGradeId: student.gradeId,
      });
      if (timetableConflicts.length) return res.status(409).json({ error: timetableConflicts[0], conflicts: timetableConflicts });
      const enrollment = await prisma.enrollment.create({
          data: {
            studentId,
            courseId,
             classId: classId.data,
            status: 'ACTIVE',
            admissionDate: new Date(),
          },
        });

      let billingDetails = {};
       if (type.data === 'MUSIC') {
        billingDetails = {
          mode: 'INSTALLMENTS',
           instalmentCount: customFeeSettings.data.installmentsCount || 3,
           amountPerInstallment: customFeeSettings.data.amountPerInstallment || 2500,
        };
       } else if (type.data === 'SHORT_TERM') {
        billingDetails = {
          mode: 'FIXED_DURATION',
           endDate: customFeeSettings.data.endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        };
      } else {
        billingDetails = {
          mode: 'STANDARD_MONTHLY',
        };
      }

      return res.status(201).json({
         message: `Specialized ${type.data} enrollment processed successfully.`,
        enrollment,
        specializedConfig: {
           type: type.data,
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
    const input = parseEnrollmentIds(req.body, ['reason', 'refundAmount']);
    if (!input.success) return res.status(400).json({ error: input.error });
    const { studentId, courseId } = input.data;
    const reason = readTrimmedString(input.data.shape, 'reason', { required: true, maxLength: 2_000, message: 'A refund reason is required.' });
    const refundAmount = readFiniteNumber(input.data.shape, 'refundAmount', { min: 0.01, max: 100_000_000, message: 'Refund amount must be a positive finite number.' });
    if (!reason.success) return res.status(400).json({ error: reason.error });
    if (!refundAmount.success) return res.status(400).json({ error: refundAmount.error });
    const tenantId = req.tenantId!;
    const requestedAmount = refundAmount.data;

    try {
      const [tenantPolicy, student, course] = await Promise.all([
        prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } }),
        prisma.student.findFirst({
          where: { id: studentId, user: { tenantId } },
          include: { studentParents: { include: { parent: true } } },
        }),
        prisma.course.findFirst({ where: { id: courseId, tenantId } }),
      ]);
      if (!student || !course) {
        return res.status(404).json({ error: 'Student or course not found in your institution.' });
      }
      const isParent = student.studentParents.some((link) => link.parent.userId === req.user!.id);
      const canManageBilling = hasBranchPermission(req.user!, 'manage_billing', course.branchId);
      if (!isParent && !canManageBilling) {
        return res.status(403).json({ error: 'Only the linked parent or assigned billing staff may request this refund.' });
      }
      const refund = await prisma.refundRequest.create({
          data: {
            tenantId,
            studentId,
            courseId,
             reason: reason.data,
            refundAmount: requestedAmount,
            deductionAmount: 0.0,
            status: 'PENDING',
            policySnapshot: {
              refundPolicy: tenantPolicy.refundPolicy,
              requestedAt: new Date().toISOString(),
            },
          },
        });
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
      if (!isTenantAdmin(req.user!)) return res.status(403).json({ error: 'Only the Tenant Admin may process refunds.' });
      const refund = await prisma.refundRequest.findFirst({ where: { id, tenantId: req.tenantId! } });

      if (!refund) return res.status(404).json({ error: 'Refund request not found.' });
      if (refund.status !== 'PENDING') return res.status(409).json({ error: 'Refund request has already been processed.' });

      const finalStatus = action === 'APPROVE' ? 'APPROVED_FOR_MANUAL_REFUND' : 'REJECTED';
      const actualDeduction = deductionAmount !== undefined ? Number(deductionAmount) : 500.00;
      if (!Number.isFinite(actualDeduction) || actualDeduction < 0 || actualDeduction > refund.refundAmount) {
        return res.status(400).json({ error: 'Deduction must be between zero and the requested refund amount.' });
      }
      const netRefundAmount = refund.refundAmount - actualDeduction;

      const transition = await prisma.refundRequest.updateMany({
          where: { id, tenantId: req.tenantId!, status: 'PENDING' },
          data: {
            status: finalStatus,
            deductionAmount: actualDeduction,
            approvedBy: req.user!.id,
            approvedAt: new Date(),
          },
        });
      if (transition.count !== 1) {
        return res.status(409).json({ error: 'Refund request was processed by another request.' });
      }

      return res.status(200).json({
        message: action === 'APPROVE'
          ? 'Refund approved for manual settlement. No money has been sent by TMS.'
          : 'Refund request rejected.',
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

router.post('/refund/settle/:id', authMiddleware, async (req: TenantRequest, res: Response) => {
  if (!isTenantAdmin(req.user!)) return res.status(403).json({ error: 'Only the Tenant Admin may reconcile a manual refund.' });
  const reference = typeof req.body?.reference === 'string' ? req.body.reference.trim() : '';
  const remarks = typeof req.body?.remarks === 'string' ? req.body.remarks.trim() : '';
  if (!reference) return res.status(400).json({ error: 'External settlement reference is required.' });
  const refund = await prisma.refundRequest.findFirst({ where: { id: req.params.id, tenantId: req.tenantId! } });
  if (!refund) return res.status(404).json({ error: 'Refund request not found.' });
  if (refund.status !== 'APPROVED_FOR_MANUAL_REFUND') {
    return res.status(409).json({ error: 'Refund must be approved for manual settlement first.' });
  }
  const transition = await prisma.refundRequest.updateMany({
    where: { id: refund.id, tenantId: req.tenantId!, status: 'APPROVED_FOR_MANUAL_REFUND' },
    data: {
      status: 'MANUALLY_REFUNDED',
      settlementReference: reference,
      settlementRemarks: remarks || null,
      settledAt: new Date(),
      settledBy: req.user!.id,
    },
  });
  if (transition.count !== 1) {
    return res.status(409).json({ error: 'Refund was reconciled by another request.' });
  }
  const settled = await prisma.refundRequest.findUniqueOrThrow({ where: { id: refund.id } });
  return res.json({ message: 'Manual refund reconciled. TMS did not transfer funds.', refund: settled });
});

// Unenroll a student (delete the enrolment row) — frees a course for deletion.
router.delete(
  '/enrollments/:id',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    try {
      const enrollment = await prisma.enrollment.findUnique({ where: { id }, include: { course: true } });
      if (!enrollment || enrollment.course.tenantId !== req.tenantId) {
        return res.status(404).json({ error: 'Enrolment not found in your institution.' });
      }
      if (!canAccessBranch(req.user!, enrollment.course.branchId)) {
        return res.status(403).json({ error: 'You cannot remove enrollments for this branch.' });
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
  async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    const shape = parseStrictKeys(req.body, ['name', 'description', 'type', 'feeStructure', 'isTaxExempt', 'taxPercentage', 'gradeId', 'isExtraActivity']);
    if (!shape.success) return res.status(400).json({ error: shape.error });

    const data: Prisma.CourseUncheckedUpdateInput = {};
    if (shape.data.name !== undefined) {
      const name = readTrimmedString(shape.data, 'name', { required: true, maxLength: 160, message: 'name must be a non-empty string of 160 characters or fewer.' });
      if (!name.success) return res.status(400).json({ error: name.error });
      data.name = name.data;
    }
    if (shape.data.description !== undefined) {
      const description = shape.data.description;
      if (description !== null && (typeof description !== 'string' || description.trim().length > 2_000)) {
        return res.status(400).json({ error: 'description must be a string of 2000 characters or fewer, or null.' });
      }
      data.description = typeof description === 'string' ? description.trim() || null : null;
    }
    if (shape.data.type !== undefined) {
      const type = parseCourseType(shape.data, 'type', true);
      if (!type.success) return res.status(400).json({ error: type.error });
      data.type = type.data!;
    }
    if (shape.data.feeStructure !== undefined) {
      const feeStructure = parseFeeStructure(shape.data.feeStructure);
      if (!feeStructure.success) return res.status(400).json({ error: feeStructure.error });
      data.feeStructure = feeStructure.data;
    }
    if (shape.data.isTaxExempt !== undefined) {
      const isTaxExempt = parseOptionalBoolean(shape.data, 'isTaxExempt', false);
      if (!isTaxExempt.success) return res.status(400).json({ error: isTaxExempt.error });
      data.isTaxExempt = isTaxExempt.data;
    }
    if (shape.data.isExtraActivity !== undefined) {
      const isExtraActivity = parseOptionalBoolean(shape.data, 'isExtraActivity', false);
      if (!isExtraActivity.success) return res.status(400).json({ error: isExtraActivity.error });
      data.isExtraActivity = isExtraActivity.data;
    }
    if (shape.data.taxPercentage !== undefined) {
      const taxPercentage = readFiniteNumber(shape.data, 'taxPercentage', { min: 0, max: 100, message: 'taxPercentage must be a finite number between 0 and 100.' });
      if (!taxPercentage.success) return res.status(400).json({ error: taxPercentage.error });
      data.taxPercentage = taxPercentage.data;
    }
    const gradeIdValue = shape.data.gradeId;
    if (gradeIdValue !== undefined) {
      if (gradeIdValue !== null && (typeof gradeIdValue !== 'string' || !gradeIdValue.trim() || gradeIdValue.length > 128)) {
        return res.status(400).json({ error: 'gradeId must be a valid ID or null.' });
      }
      data.gradeId = typeof gradeIdValue === 'string' ? gradeIdValue.trim() : null;
    }
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'At least one course field must be provided.' });
    }

    try {
      const course = await prisma.course.findUnique({ where: { id } });
      if (!course || course.tenantId !== req.tenantId) {
        return res.status(404).json({ error: 'Course not found in your institution.' });
      }
      if (!hasBranchPermission(req.user!, 'manage_courses', course.branchId)) {
        return res.status(403).json({ error: 'You cannot update courses for this branch.' });
      }

      // grade: string reassigns (validated), null clears.
      if (typeof data.gradeId === 'string') {
        const grade = await prisma.grade.findFirst({ where: { id: data.gradeId, tenantId: req.tenantId! } });
        if (!grade) {
          return res.status(404).json({ error: 'Grade not found in your institution.' });
        }
      }

      // Package-billed academic subjects never carry a second recurring fee.
      // Normalize on the server so older clients cannot accidentally double-price them.
      const targetGradeId = data.gradeId === undefined ? course.gradeId : typeof data.gradeId === 'string' ? data.gradeId : null;
      const targetType = data.type === undefined ? course.type : data.type;
      const targetIsExtraActivity = targetType !== CourseType.REGULAR || (data.isExtraActivity === undefined ? course.isExtraActivity : Boolean(data.isExtraActivity));
      data.isExtraActivity = targetIsExtraActivity;
      if (targetGradeId && targetType === CourseType.REGULAR && !targetIsExtraActivity) {
        const targetGrade = await prisma.grade.findFirst({ where: { id: targetGradeId, tenantId: req.tenantId! }, select: { billingMode: true } });
        if (targetGrade?.billingMode === GradeBillingMode.GRADE) data.feeStructure = { monthlyBase: 0 };
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
      if (!hasBranchPermission(req.user!, 'manage_courses', course.branchId)) {
        return res.status(403).json({ error: 'You cannot delete courses for this branch.' });
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
