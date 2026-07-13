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
}): Promise<CreateUserResult> {
  const temporaryPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);
  const roleId = await ensureTenantRole(params.tenantId, params.roleName);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        tenantId: params.tenantId,
        email: params.email,
        firstName: params.firstName,
        lastName: params.lastName,
        phone: params.phone || '',
        passwordHash,
        status: 'ACTIVE',
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
        data: { userId: created.id, admissionDate: new Date(), emergencyContact: params.phone || '', gradeId: params.gradeId ?? null },
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
      include: { userRoles: { include: { role: true, branch: true } } },
    });

    return res.json({
      users: users.map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        status: u.status,
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
        student: { include: { grade: true } },
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
        include: { course: { select: { name: true } }, class: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      });
      const attendance = await prisma.studentAttendance.groupBy({
        by: ['status'],
        where: { studentId: user.student.id },
        _count: { _all: true },
      });
      detail.student = {
        admissionDate: user.student.admissionDate,
        emergencyContact: user.student.emergencyContact,
        grade: user.student.grade?.name ?? null,
        enrollments: enrollments.map((e) => ({
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

export default router;
