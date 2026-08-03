import prisma from './db';

// Canonical role catalogue for a tenant. Single source of truth for the
// role name -> permission set mapping used when provisioning users.
export const ROLE_PERMISSIONS = {
  'Tenant Admin': [
    'manage_branches',
    'manage_staff',
    'manage_students',
    'manage_courses',
    'manage_billing',
    'view_reports',
    'approve_petty_cash_l2',
    'approve_leave_l2',
  ],
  'Branch Admin': [
    'manage_staff',
    'manage_students',
    'manage_courses',
    'mark_attendance',
    'approve_petty_cash_l1',
    'approve_leave_l1',
    'manage_student_exceptions',
    'manage_personalized_classes',
    'issue_certificates',
    'manage_branch_calendar',
    'manage_resource_tasks',
    'draft_social_media',
  ],
  Teacher: ['mark_geo_attendance', 'mark_attendance', 'manage_homework', 'view_own_schedule', 'submit_lesson_update'],
  Accountant: ['manage_billing', 'view_reports', 'manage_petty_cash'],
  Receptionist: ['manage_enquiries', 'view_schedules', 'manage_appointments'],
  Janitor: ['view_tasks', 'update_task_status'],
  Student: ['view_own_attendance', 'view_own_homework', 'view_own_invoices'],
  Parent: ['view_child_attendance', 'view_child_homework', 'view_child_invoices', 'chat_with_teacher'],
} as const;

export type CanonicalRoleName = keyof typeof ROLE_PERMISSIONS;

// Roles a Branch Admin (branch manager) is allowed to create within their branch.
export const BRANCH_ADMIN_CREATABLE_ROLES: CanonicalRoleName[] = [
  'Teacher',
  'Accountant',
  'Receptionist',
  'Janitor',
  'Student',
  'Parent',
];

// Roles a Tenant Admin can create anywhere in their tenant.
export const TENANT_ADMIN_CREATABLE_ROLES: CanonicalRoleName[] = [
  'Branch Admin',
  ...BRANCH_ADMIN_CREATABLE_ROLES,
];

export function isCanonicalRole(name: string): name is CanonicalRoleName {
  return Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, name);
}

// Find or create the named role within a tenant, returning its id. Roles are
// per-tenant so one tenant's role rows can never be referenced by another.
// Permissions are kept in sync with the canonical catalogue on every call so
// role definitions can evolve without leaving stale permission sets behind.
export async function ensureTenantRole(tenantId: string, roleName: CanonicalRoleName): Promise<string> {
  const permissions = [...ROLE_PERMISSIONS[roleName]];
  const existing = await prisma.role.findFirst({ where: { tenantId, name: roleName } });
  if (existing) {
    await prisma.role.update({ where: { id: existing.id }, data: { permissions } });
    return existing.id;
  }

  const created = await prisma.role.create({
    data: { tenantId, name: roleName, permissions },
  });
  return created.id;
}
