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
        data: { userId: created.id, admissionDate: new Date(), emergencyContact: params.phone || '' },
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

export default router;
