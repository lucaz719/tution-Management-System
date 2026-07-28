import { Router, Response } from 'express';
import prisma from '../utils/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { TenantRequest } from '../middleware/tenant';
import { authMiddleware } from '../middleware/auth';
import {
  BRANCH_ADMIN_CREATABLE_ROLES,
  TENANT_ADMIN_CREATABLE_ROLES,
  ensureTenantRole,
  isCanonicalRole,
  type CanonicalRoleName,
} from '../utils/roles';
import { UserPayload } from '@tms/types';
import { canReleaseAdmissionLogins } from '../utils/billing-rules';

const router = Router();

// --- Authorization helpers (explicit, not delegated to generic hasPermission) ---

function isTenantAdmin(user: UserPayload): boolean {
  // Tenant-wide Tenant Admin role (branchId === null).
  return user.roles.some((r) => r.roleName === 'Tenant Admin' && r.branchId === null);
}

// Branch ids this user administers as a Branch Admin.
function branchAdminScopes(user: UserPayload): string[] {
  return user.roles
    .filter((r) => r.roleName === 'Branch Admin' && r.branchId)
    .map((r) => r.branchId as string);
}

function generateTempPassword(): string {
  // Satisfies the shared password policy: length, upper, lower, digit, special.
  return `Tms!${crypto.randomBytes(6).toString('hex')}A9`;
}

function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

// Verify the target branch exists AND belongs to the caller's tenant.
// tenantId comes from the JWT claim (authMiddleware makes it authoritative),
// so this can never be widened by a spoofed header.
async function resolveBranchInTenant(tenantId: string, branchId: string) {
  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch || branch.tenantId !== tenantId) {
    return null;
  }
  return branch;
}

interface CreateUserResult {
  userId: string;
  email: string;
  temporaryPassword: string;
}

// Shared creation core: creates the User, assigns the role scoped to a branch
// (or tenant-wide for Branch Admin managers), and creates the matching domain
// record (StaffRecord / Student / Parent).
async function provisionUser(params: {
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  roleName: CanonicalRoleName;
  branchId: string | null;
  gradeId?: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
  admissionStatus?: 'PENDING_PAYMENT' | 'READY_FOR_LOGIN' | 'ACTIVE';
}): Promise<CreateUserResult> {
  const temporaryPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);
  const roleId = await ensureTenantRole(params.tenantId, params.roleName);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        tenantId: params.tenantId,
        email: params.email,
        name: `${params.firstName} ${params.lastName}`.trim(),
        firstName: params.firstName,
        lastName: params.lastName,
        phone: params.phone || '',
        passwordHash,
        status: params.status ?? 'ACTIVE',
      },
    });

    await tx.account.create({
      data: {
        accountId: created.id,
        providerId: 'credential',
        userId: created.id,
        password: passwordHash,
      },
    });

    await tx.userRole.create({
      data: { userId: created.id, roleId, branchId: params.branchId },
    });

    if (['Teacher', 'Accountant', 'Receptionist', 'Janitor'].includes(params.roleName)) {
      await tx.staffRecord.create({
        data: {
          userId: created.id,
          joiningDate: new Date(),
          designation: params.roleName,
          contractType: 'FIXED',
          salaryStructure: {},
        },
      });
    } else if (params.roleName === 'Student') {
      await tx.student.create({
        data: {
          userId: created.id,
          admissionDate: new Date(),
          emergencyContact: params.phone || '',
          gradeId: params.gradeId ?? null,
          admissionStatus: params.admissionStatus ?? 'ACTIVE',
        },
      });
    } else if (params.roleName === 'Parent') {
      await tx.parent.create({ data: { userId: created.id } });
    }

    return created;
  });

  return { userId: user.id, email: user.email, temporaryPassword };
}

function validateNewUserBody(body: any): { firstName: string; lastName: string; email: string; phone: string } | null {
  const firstName = typeof body?.firstName === 'string' ? body.firstName.trim() : '';
  const lastName = typeof body?.lastName === 'string' ? body.lastName.trim() : '';
  const email = normalizeEmail(body?.email);
  const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';

  if (!firstName || !lastName || !email) {
    return null;
  }
  return { firstName, lastName, email, phone };
}

// --- Caller capabilities: drives what the People UI can do ---
router.get('/me', authMiddleware, async (req: TenantRequest, res: Response) => {
  const user = req.user as UserPayload;
  const tenantAdmin = isTenantAdmin(user);
  const scopes = branchAdminScopes(user);

  try {
    const branches = await prisma.branch.findMany({
      where: {
        tenantId: req.tenantId!,
        ...(tenantAdmin ? {} : { id: { in: scopes } }),
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true },
    });

    return res.json({
      isTenantAdmin: tenantAdmin,
      isBranchAdmin: scopes.length > 0,
      canManagePeople: tenantAdmin || scopes.length > 0,
      creatableRoles: tenantAdmin ? TENANT_ADMIN_CREATABLE_ROLES : BRANCH_ADMIN_CREATABLE_ROLES,
      manageableBranches: branches,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to load capabilities.', details: error.message });
  }
});

// Admission creates inactive Student/Parent accounts and an admission invoice.
// Credentials are released only through the activation endpoint after payment.
router.post('/admissions', authMiddleware, async (req: TenantRequest, res: Response) => {
  const caller = req.user as UserPayload;
  const tenantAdmin = isTenantAdmin(caller);
  const scopes = branchAdminScopes(caller);
  const branchId = typeof req.body?.branchId === 'string' ? req.body.branchId : '';
  const gradeId = typeof req.body?.gradeId === 'string' ? req.body.gradeId : '';
  if (!tenantAdmin && !scopes.includes(branchId)) {
    return res.status(403).json({ error: 'Only the Tenant Admin or assigned Branch Admin may create admissions.' });
  }

  const studentFields = validateNewUserBody(req.body?.student);
  const parentFields = validateNewUserBody(req.body?.parent);
  if (!branchId || !gradeId || !studentFields || !parentFields) {
    return res.status(400).json({
      error: 'branchId, gradeId, and complete student and parent identity details are required.',
    });
  }

  const [branch, grade, existing] = await Promise.all([
    prisma.branch.findFirst({ where: { id: branchId, tenantId: req.tenantId! } }),
    prisma.grade.findFirst({ where: { id: gradeId, tenantId: req.tenantId! } }),
    prisma.user.findFirst({
      where: { email: { in: [studentFields.email, parentFields.email] } },
      select: { email: true },
    }),
  ]);
  if (!branch || !grade) return res.status(404).json({ error: 'Branch or grade was not found in your institution.' });
  if (studentFields.email === parentFields.email) {
    return res.status(400).json({ error: 'Student and parent must use different email addresses.' });
  }
  if (existing) return res.status(409).json({ error: `An account already exists for ${existing.email}.` });
  if (grade.admissionFee <= 0) {
    return res.status(422).json({ error: 'Configure a positive admission fee for this grade before admitting students.' });
  }

  const [studentRoleId, parentRoleId] = await Promise.all([
    ensureTenantRole(req.tenantId!, 'Student'),
    ensureTenantRole(req.tenantId!, 'Parent'),
  ]);
  const hiddenStudentPassword = await bcrypt.hash(generateTempPassword(), 10);
  const hiddenParentPassword = await bcrypt.hash(generateTempPassword(), 10);
  const now = new Date();
  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + 7);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const studentUser = await tx.user.create({
        data: {
          tenantId: req.tenantId!,
          email: studentFields.email,
          name: `${studentFields.firstName} ${studentFields.lastName}`,
          firstName: studentFields.firstName,
          lastName: studentFields.lastName,
          phone: studentFields.phone,
          passwordHash: hiddenStudentPassword,
          status: 'INACTIVE',
        },
      });
      await tx.account.create({
        data: { accountId: studentUser.id, providerId: 'credential', userId: studentUser.id, password: hiddenStudentPassword },
      });
      await tx.userRole.create({ data: { userId: studentUser.id, roleId: studentRoleId, branchId } });
      const student = await tx.student.create({
        data: {
          userId: studentUser.id,
          gradeId,
          admissionDate: now,
          emergencyContact: studentFields.phone || parentFields.phone,
          admissionStatus: 'PENDING_PAYMENT',
        },
      });

      const parentUser = await tx.user.create({
        data: {
          tenantId: req.tenantId!,
          email: parentFields.email,
          name: `${parentFields.firstName} ${parentFields.lastName}`,
          firstName: parentFields.firstName,
          lastName: parentFields.lastName,
          phone: parentFields.phone,
          passwordHash: hiddenParentPassword,
          status: 'INACTIVE',
        },
      });
      await tx.account.create({
        data: { accountId: parentUser.id, providerId: 'credential', userId: parentUser.id, password: hiddenParentPassword },
      });
      await tx.userRole.create({ data: { userId: parentUser.id, roleId: parentRoleId, branchId } });
      const parent = await tx.parent.create({ data: { userId: parentUser.id } });
      await tx.studentParent.create({ data: { studentId: student.id, parentId: parent.id } });

      const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: req.tenantId! } });
      const invoice = await tx.invoice.create({
        data: {
          tenantId: req.tenantId!,
          studentId: student.id,
          invoiceType: 'ADMISSION',
          panNumberSnapshot: tenant.panNumber,
          vatRateSnapshot: tenant.vatRate,
          amount: grade.admissionFee,
          netPayable: grade.admissionFee,
          billingCycleStart: now,
          billingCycleEnd: now,
          dueDate,
          status: 'UNPAID',
        },
      });
      return { student, parent, invoice };
    });

    return res.status(201).json({
      message: 'Admission created. Student and parent logins remain disabled until the admission invoice is paid.',
      admission: {
        studentId: result.student.id,
        parentId: result.parent.id,
        branchId,
        gradeId,
        status: result.student.admissionStatus,
        invoiceId: result.invoice.id,
        admissionFee: result.invoice.netPayable,
      },
    });
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'Student or parent email already exists.' });
    return res.status(500).json({ error: 'Failed to create admission.' });
  }
});

router.post('/admissions/:studentId/issue-logins', authMiddleware, async (req: TenantRequest, res: Response) => {
  const caller = req.user as UserPayload;
  const student = await prisma.student.findFirst({
    where: { id: req.params.studentId, user: { tenantId: req.tenantId! } },
    include: {
      user: { include: { userRoles: true } },
      studentParents: { include: { parent: { include: { user: true } } } },
      invoices: { where: { invoiceType: 'ADMISSION' }, orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
  if (!student) return res.status(404).json({ error: 'Admission not found.' });
  const branchId = student.user.userRoles.find((role) => role.branchId)?.branchId;
  if (!branchId || (!isTenantAdmin(caller) && !branchAdminScopes(caller).includes(branchId))) {
    return res.status(403).json({ error: 'Only the Tenant Admin or assigned Branch Admin may issue these logins.' });
  }
  if (!canReleaseAdmissionLogins(student.admissionStatus, student.invoices[0]?.status)) {
    return res.status(409).json({ error: 'Admission payment must be recorded before logins can be issued.' });
  }
  const parentUser = student.studentParents[0]?.parent.user;
  if (!parentUser) return res.status(409).json({ error: 'A linked parent account is required before issuing logins.' });

  const studentPassword = generateTempPassword();
  const parentPassword = generateTempPassword();
  const [studentHash, parentHash] = await Promise.all([
    bcrypt.hash(studentPassword, 10),
    bcrypt.hash(parentPassword, 10),
  ]);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: student.userId }, data: { status: 'ACTIVE', passwordHash: studentHash } });
    await tx.account.updateMany({ where: { userId: student.userId, providerId: 'credential' }, data: { password: studentHash } });
    await tx.user.update({ where: { id: parentUser.id }, data: { status: 'ACTIVE', passwordHash: parentHash } });
    await tx.account.updateMany({ where: { userId: parentUser.id, providerId: 'credential' }, data: { password: parentHash } });
    await tx.student.update({ where: { id: student.id }, data: { admissionStatus: 'ACTIVE' } });
  });

  return res.json({
    message: 'Admission activated. Deliver these one-time credentials through a secure channel.',
    student: { email: student.user.email, temporaryPassword: studentPassword },
    parent: { email: parentUser.email, temporaryPassword: parentPassword },
  });
});

// --- List users in the caller's tenant (branch admins see only their branch) ---
router.get('/', authMiddleware, async (req: TenantRequest, res: Response) => {
  const user = req.user as UserPayload;
  const tenantAdmin = isTenantAdmin(user);
  const scopes = branchAdminScopes(user);

  if (!tenantAdmin && scopes.length === 0) {
    return res.status(403).json({ error: 'You do not have permission to view the user directory.' });
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        tenantId: req.tenantId!,
        // Branch admins only see users who hold a role in one of their branches.
        ...(tenantAdmin ? {} : { userRoles: { some: { branchId: { in: scopes } } } }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        userRoles: { include: { role: true, branch: true } },
        student: { select: { grade: { select: { id: true, name: true } } } },
      },
    });

    return res.json({
      users: users.map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        status: u.status,
        gradeId: u.student?.grade?.id ?? null,
        gradeName: u.student?.grade?.name ?? null,
        roles: u.userRoles.map((ur) => ({
          role: ur.role.name,
          branchId: ur.branchId,
          branchName: ur.branch?.name ?? null,
        })),
        createdAt: u.createdAt,
      })),
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to list users.', details: error.message });
  }
});

// --- Consolidated profile for any user in the tenant ---
// Returns a role-appropriate overview: students show enrolments + fee ledger,
// parents show their children + each child's dues, teachers show assigned classes.
async function studentFeeSummary(studentId: string) {
  const invoices = await prisma.invoice.findMany({
    where: { studentId },
    orderBy: { dueDate: 'desc' },
  });
  const num = (v: any) => Number(v ?? 0);
  const totalBilled = invoices.reduce((s, i) => s + num(i.netPayable), 0);
  const totalPaid = invoices.filter((i) => i.status === 'PAID').reduce((s, i) => s + num(i.netPayable), 0);
  const totalDue = invoices
    .filter((i) => i.status === 'UNPAID' || i.status === 'OVERDUE')
    .reduce((s, i) => s + num(i.netPayable), 0);
  const overdueCount = invoices.filter((i) => i.status === 'OVERDUE').length;
  return {
    totalBilled,
    totalPaid,
    totalDue,
    overdueCount,
    invoices: invoices.slice(0, 8).map((i) => ({
      id: i.id,
      netPayable: num(i.netPayable),
      status: i.status,
      dueDate: i.dueDate,
      paymentDate: i.paymentDate,
    })),
  };
}

router.get('/:id/profile', authMiddleware, async (req: TenantRequest, res: Response) => {
  const caller = req.user as UserPayload;
  const tenantAdmin = isTenantAdmin(caller);
  const scopes = branchAdminScopes(caller);
  if (!tenantAdmin && scopes.length === 0) {
    return res.status(403).json({ error: 'You do not have permission to view profiles.' });
  }

  try {
    const user = await prisma.user.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId! },
      include: {
        userRoles: { include: { role: true, branch: true } },
        student: { include: { grade: { select: { name: true, monthlyFee: true } } } },
        parent: true,
        staffRecord: true,
      },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found in your institution.' });
    }

    // Branch admins may only view users who hold a role in one of their branches.
    if (!tenantAdmin) {
      const inScope = user.userRoles.some((ur) => ur.branchId && scopes.includes(ur.branchId));
      if (!inScope) {
        return res.status(403).json({ error: 'This user is outside the branches you manage.' });
      }
    }

    const roleNames = user.userRoles.map((ur) => ur.role.name);
    const base = {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phone: user.phone,
      status: user.status,
      createdAt: user.createdAt,
      roles: user.userRoles.map((ur) => ({ role: ur.role.name, branchName: ur.branch?.name ?? null })),
    };

    const detail: Record<string, unknown> = {};

    // Student overview: enrolments + fee ledger + attendance.
    if (user.student) {
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: user.student.id },
        include: {
          course: { select: { name: true, feeStructure: true, isTaxExempt: true, taxPercentage: true } },
          class: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      // Live recurring monthly fee = grade tuition (all subjects) + active extra
      // activity enrolments.
      const gradeTuition = user.student.grade?.monthlyFee ?? 0;
      const extrasFee = enrollments
        .filter((e) => e.status === 'ACTIVE')
        .reduce((sum, e) => {
          const base = Number((e.course.feeStructure as { monthlyBase?: number })?.monthlyBase || 0);
          return sum + (e.course.isTaxExempt ? base : base * (1 + Number(e.course.taxPercentage || 13) / 100));
        }, 0);
      const monthlyFee = gradeTuition + extrasFee;
      const attendance = await prisma.studentAttendance.groupBy({
        by: ['status'],
        where: { studentId: user.student.id },
        _count: { _all: true },
      });
      detail.student = {
        admissionDate: user.student.admissionDate,
        emergencyContact: user.student.emergencyContact,
        studentId: user.student.id,
        grade: user.student.grade?.name ?? null,
        gradeTuition,
        monthlyFee: Math.round(monthlyFee * 100) / 100,
        enrollments: enrollments.map((e) => ({
          id: e.id,
          courseName: e.course.name,
          className: e.class.name,
          status: e.status,
        })),
        fees: await studentFeeSummary(user.student.id),
        attendance: attendance.reduce<Record<string, number>>((acc, a) => {
          acc[a.status] = a._count._all;
          return acc;
        }, {}),
      };
    }

    // Parent overview: children + each child's fee summary.
    if (user.parent) {
      const links = await prisma.studentParent.findMany({
        where: { parentId: user.parent.id },
        include: { student: { include: { user: { select: { firstName: true, lastName: true } } } } },
      });
      const children = await Promise.all(
        links.map(async (l) => {
          const fees = await studentFeeSummary(l.studentId);
          const enrollCount = await prisma.enrollment.count({ where: { studentId: l.studentId, status: 'ACTIVE' } });
          return {
            studentId: l.studentId,
            studentUserId: l.student.userId,
            name: `${l.student.user.firstName} ${l.student.user.lastName}`,
            activeEnrollments: enrollCount,
            totalPaid: fees.totalPaid,
            totalDue: fees.totalDue,
            overdueCount: fees.overdueCount,
          };
        })
      );
      detail.parent = { children };
    }

    // Teacher overview: assigned classes + grades taught + session stats.
    if (roleNames.includes('Teacher')) {
      const assigned = await prisma.class.findMany({
        where: { teacherId: user.id },
        include: {
          course: { select: { name: true, grade: { select: { name: true, sortOrder: true } } } },
          branch: { select: { name: true } },
          _count: { select: { enrollments: true } },
        },
      });
      const sessionCount = await prisma.teacherSession.count({ where: { teacherId: user.id } });
      const pendingUpdates = await prisma.teacherSession.count({ where: { teacherId: user.id, dailyUpdateSubmitted: false } });

      // Distinct grades taught, ordered by the grade ladder.
      const gradeMap = new Map<string, number>();
      for (const c of assigned) {
        if (c.course.grade) gradeMap.set(c.course.grade.name, c.course.grade.sortOrder);
      }
      const gradesTaught = Array.from(gradeMap.entries())
        .sort((a, b) => a[1] - b[1])
        .map(([name]) => name);

      detail.teacher = {
        assignedClasses: assigned.map((c) => ({
          className: c.name,
          courseName: c.course.name,
          branchName: c.branch.name,
          gradeName: c.course.grade?.name ?? null,
          enrollmentCount: c._count.enrollments,
        })),
        gradesTaught,
        totalSessions: sessionCount,
        pendingUpdates,
      };
    }

    // Staff overview (accountant/receptionist/janitor/teacher share StaffRecord).
    if (user.staffRecord) {
      detail.staff = {
        designation: user.staffRecord.designation,
        contractType: user.staffRecord.contractType,
        joiningDate: user.staffRecord.joiningDate,
      };
    }

    return res.json({ ...base, detail });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to load profile.', details: error.message });
  }
});

// --- Student analytics (admin / branch-admin / assigned teacher / parent / self) ---
router.get('/:id/analytics', authMiddleware, async (req: TenantRequest, res: Response) => {
  const caller = req.user as UserPayload;
  try {
    const target = await prisma.user.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId! },
      include: { student: { include: { grade: { select: { name: true } } } } },
    });
    if (!target || !target.student) {
      return res.status(404).json({ error: 'Student not found in your institution.' });
    }
    const studentId = target.student.id;

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId },
      include: {
        course: { select: { name: true } },
        class: { select: { id: true, name: true, teacherId: true, assignedTeacher: { select: { firstName: true, lastName: true } } } },
      },
    });
    const classIds = Array.from(new Set(enrollments.map((e) => e.classId)));

    // Access: admin (scoped), self, assigned teacher, or a linked parent.
    let allowed = isTenantAdmin(caller) || caller.id === target.id;
    const scopes = branchAdminScopes(caller);
    if (!allowed && scopes.length > 0) {
      allowed = Boolean(await prisma.userRole.findFirst({ where: { userId: target.id, branchId: { in: scopes } } }));
    }
    if (!allowed && classIds.length > 0) {
      allowed = Boolean(await prisma.class.findFirst({ where: { id: { in: classIds }, teacherId: caller.id } }));
    }
    if (!allowed) {
      const parent = await prisma.parent.findUnique({ where: { userId: caller.id } });
      if (parent) {
        allowed = Boolean(await prisma.studentParent.findFirst({ where: { studentId, parentId: parent.id } }));
      }
    }
    if (!allowed) {
      return res.status(403).json({ error: 'You do not have access to this student\'s analytics.' });
    }

    // Attendance — full records power the totals, the monthly trend, and per-course rates.
    const attRecords = await prisma.studentAttendance.findMany({
      where: { studentId },
      select: { classId: true, status: true, date: true },
      orderBy: { date: 'asc' },
    });
    const countStatus = (s: string) => attRecords.filter((r) => r.status === s).length;
    const present = countStatus('PRESENT'), absent = countStatus('ABSENT'), excused = countStatus('EXCUSED'), blocked = countStatus('BLOCKED');
    const totalMarked = attRecords.length;

    const today = new Date();
    const attendanceTrend = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() - (5 - i), 1);
      const inMonth = attRecords.filter((r) => r.date.getFullYear() === d.getFullYear() && r.date.getMonth() === d.getMonth());
      const p = inMonth.filter((r) => r.status === 'PRESENT').length;
      return {
        month: d.toLocaleString('en', { month: 'short' }),
        present: p,
        total: inMonth.length,
        rate: inMonth.length ? Math.round((p / inMonth.length) * 100) : null,
      };
    });

    // Fees
    const fees = await studentFeeSummary(studentId);
    const billed = fees.totalPaid + fees.totalDue;

    // Homework — every assignment in the student's classes matched to their submissions,
    // so the profile can track each homework individually (status, lateness, grade).
    const homeworks = classIds.length
      ? await prisma.homework.findMany({
          where: { classId: { in: classIds } },
          orderBy: { deadline: 'desc' },
          select: { id: true, classId: true, subject: true, title: true, deadline: true },
        })
      : [];
    const subs = await prisma.homeworkSubmission.findMany({
      where: { studentId },
      select: { homeworkId: true, grade: true, remarks: true, createdAt: true, updatedAt: true },
    });
    const subByHw = new Map(subs.map((s) => [s.homeworkId, s]));
    const courseByClass = new Map(enrollments.map((e) => [e.classId, e.course.name]));

    const nowMs = Date.now();
    const homeworkTimeline = homeworks.slice(0, 30).map((hw) => {
      const sub = subByHw.get(hw.id);
      const status = sub
        ? (sub.grade != null ? 'GRADED' : 'SUBMITTED')
        : (hw.deadline.getTime() < nowMs ? 'OVERDUE' : 'PENDING');
      return {
        id: hw.id,
        title: hw.title,
        subject: hw.subject,
        course: courseByClass.get(hw.classId) ?? null,
        deadline: hw.deadline,
        status,
        late: sub ? sub.createdAt.getTime() > hw.deadline.getTime() : false,
        grade: sub?.grade ?? null,
        submittedAt: sub?.createdAt ?? null,
      };
    });

    const assigned = homeworks.length;
    const submittedHw = homeworks.filter((hw) => subByHw.has(hw.id));
    const submitted = submittedHw.length;
    const graded = submittedHw.filter((hw) => subByHw.get(hw.id)!.grade != null).length;
    const onTime = submittedHw.filter((hw) => subByHw.get(hw.id)!.createdAt.getTime() <= hw.deadline.getTime()).length;
    const overdueHw = homeworks.filter((hw) => !subByHw.has(hw.id) && hw.deadline.getTime() < nowMs).length;

    // Per-course mapping — one entry per enrolment with the class, teacher, and the
    // student's attendance/homework performance inside that course.
    const perCourse = enrollments.map((e) => {
      const classAtt = attRecords.filter((r) => r.classId === e.classId);
      const classPresent = classAtt.filter((r) => r.status === 'PRESENT').length;
      const classHw = homeworks.filter((h) => h.classId === e.classId);
      return {
        course: e.course.name,
        className: e.class.name,
        teacher: e.class.assignedTeacher ? `${e.class.assignedTeacher.firstName} ${e.class.assignedTeacher.lastName}` : null,
        status: e.status,
        attendanceRate: classAtt.length ? Math.round((classPresent / classAtt.length) * 100) : null,
        homeworkAssigned: classHw.length,
        homeworkSubmitted: classHw.filter((h) => subByHw.has(h.id)).length,
      };
    });

    // Recent activity — submissions, grades received, attendance marks, and fee
    // payments merged into one newest-first feed.
    const hwTitle = new Map(homeworks.map((h) => [h.id, h.title]));
    const activity: Array<{ type: string; date: Date; label: string; detail?: string }> = [];
    subs.forEach((s) => {
      const title = hwTitle.get(s.homeworkId);
      if (!title) return;
      activity.push({ type: 'submission', date: s.createdAt, label: `Submitted "${title}"` });
      if (s.grade != null) {
        activity.push({ type: 'grade', date: s.updatedAt, label: `Received ${s.grade} for "${title}"`, detail: s.remarks ?? undefined });
      }
    });
    attRecords.slice(-20).forEach((r) => {
      const course = courseByClass.get(r.classId);
      const word = r.status.charAt(0) + r.status.slice(1).toLowerCase();
      activity.push({ type: 'attendance', date: r.date, label: `${word} in ${course ?? 'class'}` });
    });
    fees.invoices.forEach((i) => {
      if (i.paymentDate) activity.push({ type: 'payment', date: i.paymentDate, label: `Paid invoice — NPR ${i.netPayable.toLocaleString()}` });
    });
    activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Graph connections
    const teachers = Array.from(new Set(
      enrollments.map((e) => e.class.assignedTeacher ? `${e.class.assignedTeacher.firstName} ${e.class.assignedTeacher.lastName}` : null).filter(Boolean) as string[]
    ));
    const parentLinks = await prisma.studentParent.findMany({
      where: { studentId },
      include: { parent: { include: { user: { select: { firstName: true, lastName: true } } } } },
    });

    return res.json({
      name: `${target.firstName} ${target.lastName}`,
      grade: target.student.grade?.name ?? null,
      attendance: {
        present, absent, excused, blocked, totalMarked,
        rate: totalMarked ? Math.round((present / totalMarked) * 100) : null,
        trend: attendanceTrend,
      },
      homework: {
        assigned, submitted, graded,
        pending: Math.max(0, assigned - submitted),
        overdue: overdueHw,
        completionRate: assigned ? Math.round((submitted / assigned) * 100) : null,
        onTimeRate: submitted ? Math.round((onTime / submitted) * 100) : null,
        timeline: homeworkTimeline,
      },
      fees: {
        paid: fees.totalPaid, due: fees.totalDue, overdue: fees.overdueCount,
        collectionRate: billed ? Math.round((fees.totalPaid / billed) * 100) : null,
      },
      activeCourses: enrollments.filter((e) => e.status === 'ACTIVE').map((e) => e.course.name),
      perCourse,
      activity: activity.slice(0, 15),
      connections: {
        courses: Array.from(new Set(enrollments.map((e) => e.course.name))),
        teachers,
        parents: parentLinks.map((pl) => `${pl.parent.user.firstName} ${pl.parent.user.lastName}`),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to load analytics.', details: error.message });
  }
});

// --- Tenant Admin creates a Branch Admin (manager) for a branch ---
router.post('/branch-admin', authMiddleware, async (req: TenantRequest, res: Response) => {
  const user = req.user as UserPayload;

  if (!isTenantAdmin(user)) {
    return res.status(403).json({ error: 'Only a Tenant Admin can create branch managers.' });
  }

  const fields = validateNewUserBody(req.body);
  if (!fields) {
    return res.status(400).json({ error: 'firstName, lastName, and email are required.' });
  }

  const branchId = typeof req.body?.branchId === 'string' ? req.body.branchId : '';
  if (!branchId) {
    return res.status(400).json({ error: 'branchId is required for a branch manager.' });
  }

  const branch = await resolveBranchInTenant(req.tenantId!, branchId);
  if (!branch) {
    return res.status(404).json({ error: 'Branch not found in your institution.' });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email: fields.email } });
    if (existing) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }

    const result = await provisionUser({
      tenantId: req.tenantId!,
      ...fields,
      roleName: 'Branch Admin',
      branchId,
    });

    return res.status(201).json({
      message: `Branch manager created for ${branch.name}.`,
      user: { id: result.userId, email: result.email, branch: branch.name },
      temporaryPassword: result.temporaryPassword,
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }
    return res.status(500).json({ error: 'Failed to create branch manager.', details: error.message });
  }
});

// --- Create staff or student in a branch ---
// Tenant Admin: any branch in the tenant. Branch Admin: only their own branch(es).
// Neither can create Branch Admins or escalate here.
router.post('/', authMiddleware, async (req: TenantRequest, res: Response) => {
  const user = req.user as UserPayload;
  const tenantAdmin = isTenantAdmin(user);
  const scopes = branchAdminScopes(user);

  if (!tenantAdmin && scopes.length === 0) {
    return res.status(403).json({ error: 'You do not have permission to create users.' });
  }

  const fields = validateNewUserBody(req.body);
  if (!fields) {
    return res.status(400).json({ error: 'firstName, lastName, and email are required.' });
  }

  const roleName = typeof req.body?.role === 'string' ? req.body.role : '';
  if (!isCanonicalRole(roleName)) {
    return res.status(400).json({ error: 'Unknown role.' });
  }

  // A Branch Admin can only create the branch-level roles, never managers/admins.
  const allowedRoles = tenantAdmin ? TENANT_ADMIN_CREATABLE_ROLES : BRANCH_ADMIN_CREATABLE_ROLES;
  if (!allowedRoles.includes(roleName)) {
    return res.status(403).json({ error: `You are not allowed to create the role "${roleName}".` });
  }
  if (roleName === 'Branch Admin') {
    return res.status(400).json({ error: 'Use the branch-manager endpoint to create Branch Admins.' });
  }

  const branchId = typeof req.body?.branchId === 'string' ? req.body.branchId : '';
  if (!branchId) {
    return res.status(400).json({ error: 'branchId is required.' });
  }

  const branch = await resolveBranchInTenant(req.tenantId!, branchId);
  if (!branch) {
    return res.status(404).json({ error: 'Branch not found in your institution.' });
  }

  // Branch admins are confined to the branches they manage.
  if (!tenantAdmin && !scopes.includes(branchId)) {
    return res.status(403).json({ error: 'You can only add users to a branch you manage.' });
  }

  // Optional grade for students — must belong to the tenant.
  let gradeId: string | null = null;
  if (roleName === 'Student' && typeof req.body?.gradeId === 'string' && req.body.gradeId) {
    const grade = await prisma.grade.findFirst({ where: { id: req.body.gradeId, tenantId: req.tenantId! } });
    if (!grade) {
      return res.status(404).json({ error: 'Grade not found in your institution.' });
    }
    gradeId = grade.id;
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email: fields.email } });
    if (existing) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }

    const result = await provisionUser({
      tenantId: req.tenantId!,
      ...fields,
      roleName,
      branchId,
      gradeId,
    });

    return res.status(201).json({
      message: `${roleName} created in ${branch.name}.`,
      user: { id: result.userId, email: result.email, role: roleName, branch: branch.name },
      temporaryPassword: result.temporaryPassword,
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }
    return res.status(500).json({ error: 'Failed to create user.', details: error.message });
  }
});

// --- Bulk student import (from an Excel/CSV parsed to JSON on the client) ---
interface BulkStudentRow {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  branchName?: string;
  grade?: string;
  emergencyContact?: string;
  parentFirstName?: string;
  parentLastName?: string;
  parentEmail?: string;
  parentPhone?: string;
}

router.post('/bulk-students', authMiddleware, async (req: TenantRequest, res: Response) => {
  const caller = req.user as UserPayload;
  const tenantAdmin = isTenantAdmin(caller);
  const scopes = branchAdminScopes(caller);
  if (!tenantAdmin && scopes.length === 0) {
    return res.status(403).json({ error: 'You do not have permission to import students.' });
  }

  const rows: BulkStudentRow[] = Array.isArray(req.body?.students) ? req.body.students : [];
  if (rows.length === 0) {
    return res.status(400).json({ error: 'No rows provided.' });
  }
  if (rows.length > 500) {
    return res.status(400).json({ error: 'Too many rows in one import (max 500). Split the file.' });
  }

  // Resolve the tenant's branches once, scoped for branch admins.
  const branches = await prisma.branch.findMany({
    where: { tenantId: req.tenantId!, ...(tenantAdmin ? {} : { id: { in: scopes } }) },
    select: { id: true, name: true },
  });
  const branchByName = new Map(branches.map((b) => [b.name.trim().toLowerCase(), b]));
  const soleBranch = branches.length === 1 ? branches[0] : null;

  // Resolve the tenant's grades once, matched by name.
  const gradeList = await prisma.grade.findMany({ where: { tenantId: req.tenantId! }, select: { id: true, name: true } });
  const gradeByName = new Map(gradeList.map((g) => [g.name.trim().toLowerCase(), g]));

  // Emails seen within this batch, to catch in-file duplicates.
  const seenEmails = new Set<string>();
  const results: Array<{ row: number; name: string; email: string; status: 'created' | 'error'; temporaryPassword?: string; parentEmail?: string; parentTemporaryPassword?: string; error?: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const rowNo = i + 1;
    const firstName = typeof raw.firstName === 'string' ? raw.firstName.trim() : '';
    const lastName = typeof raw.lastName === 'string' ? raw.lastName.trim() : '';
    const email = normalizeEmail(raw.email);
    const phone = typeof raw.phone === 'string' ? raw.phone.trim() : '';
    const emergencyContact = typeof raw.emergencyContact === 'string' ? raw.emergencyContact.trim() : '';

    const fail = (error: string) => results.push({ row: rowNo, name: `${firstName} ${lastName}`.trim(), email, status: 'error', error });

    if (!firstName || !lastName || !email) {
      fail('First name, last name, and email are required.');
      continue;
    }
    if (seenEmails.has(email)) {
      fail('Duplicate email within this file.');
      continue;
    }

    // Resolve branch: by name, or the sole branch if the column was left blank.
    const branchKey = typeof raw.branchName === 'string' ? raw.branchName.trim().toLowerCase() : '';
    const branch = branchKey ? branchByName.get(branchKey) : soleBranch;
    if (!branch) {
      fail(branchKey ? `Branch "${raw.branchName}" not found or outside your access.` : 'Branch is required (multiple branches exist).');
      continue;
    }

    // Resolve grade by name (optional). Unknown grade names are reported.
    const gradeKey = typeof raw.grade === 'string' ? raw.grade.trim().toLowerCase() : '';
    const grade = gradeKey ? gradeByName.get(gradeKey) : null;
    if (gradeKey && !grade) {
      fail(`Grade "${raw.grade}" does not exist. Create it under Grades first.`);
      continue;
    }

    try {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        fail('A user with this email already exists.');
        continue;
      }

      seenEmails.add(email);
      const created = await provisionUser({
        tenantId: req.tenantId!,
        firstName,
        lastName,
        email,
        phone: phone || emergencyContact,
        roleName: 'Student',
        branchId: branch.id,
        gradeId: grade?.id ?? null,
      });

      const result: (typeof results)[number] = {
        row: rowNo,
        name: `${firstName} ${lastName}`,
        email,
        status: 'created',
        temporaryPassword: created.temporaryPassword,
      };

      // Optional emergency contact on the Student record.
      if (emergencyContact) {
        await prisma.student.updateMany({ where: { userId: created.userId }, data: { emergencyContact } });
      }

      // Optional parent: create-or-link and connect to this student.
      const parentEmail = normalizeEmail(raw.parentEmail);
      if (parentEmail) {
        const student = await prisma.student.findUnique({ where: { userId: created.userId } });
        let parentRecord = await prisma.parent.findFirst({
          where: { user: { email: parentEmail, tenantId: req.tenantId! } },
        });

        if (!parentRecord) {
          const existingParentUser = await prisma.user.findUnique({ where: { email: parentEmail } });
          if (existingParentUser) {
            result.error = 'Parent email belongs to a non-parent account; student created without parent link.';
          } else {
            const parentProvision = await provisionUser({
              tenantId: req.tenantId!,
              firstName: (typeof raw.parentFirstName === 'string' && raw.parentFirstName.trim()) || firstName,
              lastName: (typeof raw.parentLastName === 'string' && raw.parentLastName.trim()) || lastName,
              email: parentEmail,
              phone: typeof raw.parentPhone === 'string' ? raw.parentPhone.trim() : '',
              roleName: 'Parent',
              branchId: branch.id,
            });
            parentRecord = await prisma.parent.findUnique({ where: { userId: parentProvision.userId } });
            result.parentEmail = parentEmail;
            result.parentTemporaryPassword = parentProvision.temporaryPassword;
          }
        } else {
          result.parentEmail = parentEmail;
        }

        if (student && parentRecord) {
          const linked = await prisma.studentParent.findUnique({
            where: { studentId_parentId: { studentId: student.id, parentId: parentRecord.id } },
          }).catch(() => null);
          if (!linked) {
            await prisma.studentParent.create({ data: { studentId: student.id, parentId: parentRecord.id } });
          }
        }
      }

      results.push(result);
    } catch (error: any) {
      seenEmails.delete(email);
      fail(error.code === 'P2002' ? 'A user with this email already exists.' : 'Failed to create student.');
    }
  }

  const createdCount = results.filter((r) => r.status === 'created').length;
  return res.json({ createdCount, errorCount: results.length - createdCount, results });
});

// --- Update / deactivate a user (Tenant Admin, or Branch Admin in scope) ---

// Load a user in the caller's tenant and confirm they may manage them.
async function loadManageableUser(req: TenantRequest, id: string) {
  const caller = req.user as UserPayload;
  const tenantAdmin = isTenantAdmin(caller);
  const scopes = branchAdminScopes(caller);
  if (!tenantAdmin && scopes.length === 0) return { error: 403 as const };

  const user = await prisma.user.findFirst({
    where: { id, tenantId: req.tenantId! },
    include: { userRoles: true, student: true },
  });
  if (!user) return { error: 404 as const };

  if (!tenantAdmin) {
    const inScope = user.userRoles.some((ur) => ur.branchId && scopes.includes(ur.branchId));
    if (!inScope) return { error: 403 as const };
  }
  return { user };
}

router.put('/:id', authMiddleware, async (req: TenantRequest, res: Response) => {
  const loaded = await loadManageableUser(req, req.params.id);
  if (loaded.error) {
    return res.status(loaded.error).json({ error: loaded.error === 404 ? 'User not found in your institution.' : 'You cannot manage this user.' });
  }
  const { user } = loaded;

  const data: Record<string, unknown> = {};
  if (typeof req.body?.firstName === 'string' && req.body.firstName.trim()) data.firstName = req.body.firstName.trim();
  if (typeof req.body?.lastName === 'string' && req.body.lastName.trim()) data.lastName = req.body.lastName.trim();
  if (typeof req.body?.phone === 'string') data.phone = req.body.phone.trim();
  if (['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(req.body?.status)) data.status = req.body.status;

  // Grade reassignment (students only): string sets, null clears.
  let gradeUpdate: { gradeId: string | null } | null = null;
  if (user.student && 'gradeId' in (req.body ?? {})) {
    if (req.body.gradeId === null || req.body.gradeId === '') {
      gradeUpdate = { gradeId: null };
    } else if (typeof req.body.gradeId === 'string') {
      const grade = await prisma.grade.findFirst({ where: { id: req.body.gradeId, tenantId: req.tenantId! } });
      if (!grade) return res.status(404).json({ error: 'Grade not found in your institution.' });
      gradeUpdate = { gradeId: grade.id };
    }
  }

  if (Object.keys(data).length === 0 && !gradeUpdate) {
    return res.status(400).json({ error: 'Nothing to update.' });
  }

  const gradeChanged = gradeUpdate && user.student && gradeUpdate.gradeId !== user.student.gradeId;

  try {
    if (Object.keys(data).length > 0) await prisma.user.update({ where: { id: user.id }, data });
    if (gradeUpdate && user.student) await prisma.student.update({ where: { id: user.student.id }, data: gradeUpdate });

    // Promotion reconciliation: moving to a new grade completes active enrolments
    // in courses tied to a *different* graded level, so monthly billing (which is
    // the sum of active enrolments) drops the old grade's fees. Ungraded courses
    // are left untouched. The admin then enrols in the new grade's courses.
    let droppedEnrollments = 0;
    if (gradeChanged && gradeUpdate!.gradeId && user.student) {
      const result = await prisma.enrollment.updateMany({
        where: { studentId: user.student.id, status: 'ACTIVE', course: { gradeId: { notIn: [gradeUpdate!.gradeId] } } },
        data: { status: 'COMPLETED' },
      });
      droppedEnrollments = result.count;
    }

    return res.json({ message: 'User updated.', droppedEnrollments });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update user.', details: error.message });
  }
});

// Deactivate (soft-delete): sets status INACTIVE and drops active enrolments so
// billing stops. History (invoices, records) is preserved for audit.
router.delete('/:id', authMiddleware, async (req: TenantRequest, res: Response) => {
  const loaded = await loadManageableUser(req, req.params.id);
  if (loaded.error) {
    return res.status(loaded.error).json({ error: loaded.error === 404 ? 'User not found in your institution.' : 'You cannot manage this user.' });
  }
  const { user } = loaded;
  if (user.id === (req.user as UserPayload).id) {
    return res.status(400).json({ error: 'You cannot deactivate your own account.' });
  }

  try {
    await prisma.user.update({ where: { id: user.id }, data: { status: 'INACTIVE' } });
    if (user.student) {
      await prisma.enrollment.updateMany({ where: { studentId: user.student.id, status: 'ACTIVE' }, data: { status: 'DROPPED' } });
    }
    return res.json({ message: 'User deactivated.' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to deactivate user.', details: error.message });
  }
});

export default router;
