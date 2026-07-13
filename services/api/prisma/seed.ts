import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Reserved PAN for the internal platform tenant that hosts the Super Admin.
const SYSTEM_TENANT_PAN = '000000000';

function generatePassword(): string {
  // Satisfies the UI password rules: length, upper, lower, digit, special.
  return `Tms!${crypto.randomBytes(9).toString('hex')}A7`;
}

async function main() {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? 'superadmin@tms.local').trim().toLowerCase();
  const envPassword = process.env.SEED_ADMIN_PASSWORD;
  // SEED_ADMIN_2FA=true/false toggles two-factor auth on the admin account.
  const twoFactorSetting =
    process.env.SEED_ADMIN_2FA === 'true' ? true : process.env.SEED_ADMIN_2FA === 'false' ? false : undefined;

  const systemTenant = await prisma.tenant.upsert({
    where: { panNumber: SYSTEM_TENANT_PAN },
    update: {},
    create: {
      name: 'TMS Platform',
      panNumber: SYSTEM_TENANT_PAN,
      status: 'ACTIVE',
    },
  });

  // Role has no unique constraint on (tenantId, name), so upsert manually.
  let superAdminRole = await prisma.role.findFirst({
    where: { name: 'Super Admin', tenantId: null },
  });
  if (!superAdminRole) {
    superAdminRole = await prisma.role.create({
      data: {
        tenantId: null,
        name: 'Super Admin',
        permissions: ['super_admin_manage_tenants'],
      },
    });
  }

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  let adminUserId: string;
  let printedPassword: string | null = null;

  if (existingAdmin) {
    adminUserId = existingAdmin.id;
    const updates: { passwordHash?: string; status?: 'ACTIVE'; twoFactorEnabled?: boolean } = {};
    if (envPassword) {
      updates.passwordHash = await bcrypt.hash(envPassword, 10);
      updates.status = 'ACTIVE';
    }
    if (twoFactorSetting !== undefined) {
      updates.twoFactorEnabled = twoFactorSetting;
    }
    if (Object.keys(updates).length > 0) {
      await prisma.user.update({ where: { id: existingAdmin.id }, data: updates });
    }
    if (envPassword) {
      console.log(`[seed] Existing user ${adminEmail}: password rotated from SEED_ADMIN_PASSWORD.`);
    } else {
      console.log(`[seed] User ${adminEmail} already exists — password left unchanged. Set SEED_ADMIN_PASSWORD to rotate it.`);
    }
    if (twoFactorSetting !== undefined) {
      console.log(`[seed] Two-factor auth for ${adminEmail}: ${twoFactorSetting ? 'ENABLED' : 'DISABLED'}.`);
    }
  } else {
    const password = envPassword ?? generatePassword();
    if (!envPassword) {
      printedPassword = password;
    }

    const adminUser = await prisma.user.create({
      data: {
        tenantId: systemTenant.id,
        email: adminEmail,
        firstName: 'System',
        lastName: 'Administrator',
        phone: '0000000000',
        passwordHash: await bcrypt.hash(password, 10),
        status: 'ACTIVE',
        twoFactorEnabled: twoFactorSetting ?? false,
      },
    });
    adminUserId = adminUser.id;
  }

  const existingAssignment = await prisma.userRole.findFirst({
    where: { userId: adminUserId, roleId: superAdminRole.id },
  });
  if (!existingAssignment) {
    await prisma.userRole.create({
      data: {
        userId: adminUserId,
        roleId: superAdminRole.id,
        branchId: null,
      },
    });
  }

  console.log('[seed] Bootstrap complete.');
  console.log(`[seed]   Tenant:  ${systemTenant.name} (${systemTenant.id})`);
  console.log(`[seed]   Account: ${adminEmail} (role: Super Admin)`);
  if (printedPassword) {
    console.log(`[seed]   Password (generated once, store it now): ${printedPassword}`);
  }

  if (process.env.SEED_DEMO === 'true') {
    await seedDemoTenant();
  }

  await seedSanskardip();
}

// ---------------------------------------------------------------------------
// Demo tenant: one user per role so every dashboard can be exercised locally.
// Run with SEED_DEMO=true. Passwords are generated at runtime and printed —
// re-running with SEED_DEMO=true rotates and reprints them.
// ---------------------------------------------------------------------------

const DEMO_TENANT_PAN = '111111111';

interface DemoUserSpec {
  email: string;
  firstName: string;
  lastName: string;
  roleName: string;
  permissions: string[];
  branchScoped: boolean;
}

const DEMO_USERS: DemoUserSpec[] = [
  { email: 'tenantadmin@demo.tms.local', firstName: 'Tara', lastName: 'Shrestha', roleName: 'Tenant Admin', branchScoped: false,
    permissions: ['manage_branches', 'manage_staff', 'manage_courses', 'manage_billing', 'view_reports', 'approve_petty_cash_l2', 'approve_social_media'] },
  { email: 'branchadmin@demo.tms.local', firstName: 'Bikash', lastName: 'Karki', roleName: 'Branch Admin', branchScoped: true,
    permissions: ['manage_staff', 'manage_courses', 'view_reports', 'approve_petty_cash_l1', 'approve_leave_l1'] },
  { email: 'teacher@demo.tms.local', firstName: 'Shyam', lastName: 'Adhikari', roleName: 'Teacher', branchScoped: true,
    permissions: ['mark_attendance', 'manage_homework', 'view_own_schedule', 'submit_lesson_update'] },
  { email: 'accountant@demo.tms.local', firstName: 'Anita', lastName: 'Gurung', roleName: 'Accountant', branchScoped: true,
    permissions: ['manage_billing', 'view_reports', 'manage_petty_cash'] },
  { email: 'reception@demo.tms.local', firstName: 'Rita', lastName: 'Maharjan', roleName: 'Receptionist', branchScoped: true,
    permissions: ['manage_enquiries', 'view_schedules', 'manage_appointments'] },
  { email: 'janitor@demo.tms.local', firstName: 'Jeevan', lastName: 'Tamang', roleName: 'Janitor', branchScoped: true,
    permissions: ['view_tasks', 'update_task_status'] },
  { email: 'student@demo.tms.local', firstName: 'Anisha', lastName: 'Poudel', roleName: 'Student', branchScoped: true,
    permissions: ['view_own_attendance', 'view_own_homework', 'view_own_invoices'] },
  { email: 'parent@demo.tms.local', firstName: 'Prakash', lastName: 'Poudel', roleName: 'Parent', branchScoped: true,
    permissions: ['view_child_attendance', 'view_child_homework', 'view_child_invoices', 'chat_with_teacher'] },
];

async function seedDemoTenant(): Promise<void> {
  const tenant = await prisma.tenant.upsert({
    where: { panNumber: DEMO_TENANT_PAN },
    update: {},
    create: { name: 'Pinnacle Demo Academy', panNumber: DEMO_TENANT_PAN, status: 'ACTIVE' },
  });

  let branch = await prisma.branch.findFirst({ where: { tenantId: tenant.id } });
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        tenantId: tenant.id,
        name: 'Baneshwor Branch',
        address: 'New Baneshwor, Kathmandu, Nepal',
        latitude: 27.6915,
        longitude: 85.3422,
        radiusMeters: 100,
      },
    });
  }

  const credentials: Array<{ email: string; role: string; password: string }> = [];

  for (const spec of DEMO_USERS) {
    let role = await prisma.role.findFirst({ where: { tenantId: tenant.id, name: spec.roleName } });
    if (!role) {
      role = await prisma.role.create({
        data: { tenantId: tenant.id, name: spec.roleName, permissions: spec.permissions },
      });
    }

    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
      where: { email: spec.email },
      update: { passwordHash, status: 'ACTIVE' },
      create: {
        tenantId: tenant.id,
        email: spec.email,
        firstName: spec.firstName,
        lastName: spec.lastName,
        phone: '9800000000',
        passwordHash,
        status: 'ACTIVE',
      },
    });

    const branchId = spec.branchScoped ? branch.id : null;
    const assignment = await prisma.userRole.findFirst({ where: { userId: user.id, roleId: role.id } });
    if (!assignment) {
      await prisma.userRole.create({ data: { userId: user.id, roleId: role.id, branchId } });
    }

    // Domain records so role-specific pages have a subject to load.
    if (spec.roleName === 'Teacher' || spec.roleName === 'Accountant' || spec.roleName === 'Receptionist' || spec.roleName === 'Janitor') {
      const staffRecord = await prisma.staffRecord.findUnique({ where: { userId: user.id } });
      if (!staffRecord) {
        await prisma.staffRecord.create({
          data: {
            userId: user.id,
            joiningDate: new Date('2025-01-05'),
            designation: spec.roleName,
            contractType: 'FIXED',
            salaryStructure: { basicMonthly: 45000 },
          },
        });
      }
    }

    if (spec.roleName === 'Student') {
      const student = await prisma.student.findUnique({ where: { userId: user.id } });
      if (!student) {
        await prisma.student.create({
          data: { userId: user.id, admissionDate: new Date('2025-02-01'), emergencyContact: '9800000001' },
        });
      }
    }

    if (spec.roleName === 'Parent') {
      const parent = await prisma.parent.findUnique({ where: { userId: user.id } });
      if (!parent) {
        await prisma.parent.create({ data: { userId: user.id } });
      }
    }

    credentials.push({ email: spec.email, role: spec.roleName, password });
  }

  // Link the demo student to the demo parent.
  const studentUser = await prisma.user.findUnique({ where: { email: 'student@demo.tms.local' }, include: { student: true } });
  const parentUser = await prisma.user.findUnique({ where: { email: 'parent@demo.tms.local' }, include: { parent: true } });
  if (studentUser?.student && parentUser?.parent) {
    const link = await prisma.studentParent.findUnique({
      where: { studentId_parentId: { studentId: studentUser.student.id, parentId: parentUser.parent.id } },
    });
    if (!link) {
      await prisma.studentParent.create({
        data: { studentId: studentUser.student.id, parentId: parentUser.parent.id },
      });
    }
  }

  console.log('[seed] Demo tenant ready.');
  console.log(`[seed]   Tenant: ${tenant.name} (${tenant.id}) — branch: ${branch.name}`);
  console.log('[seed]   Demo credentials (rotated on every SEED_DEMO run — store them now):');
  for (const cred of credentials) {
    console.log(`[seed]     ${cred.role.padEnd(12)} ${cred.email.padEnd(30)} ${cred.password}`);
  }
}

async function seedSanskardip(): Promise<void> {
  console.log('[seed] Seeding Sanskardip tenant and demo users...');
  
  const sanskardipTenant = await prisma.tenant.upsert({
    where: { panNumber: '999999999' },
    update: {},
    create: {
      name: 'Sanskardip',
      panNumber: '999999999',
      status: 'ACTIVE',
    },
  });

  let damakBranch = await prisma.branch.findFirst({
    where: { tenantId: sanskardipTenant.id, name: 'Damak' },
  });
  if (!damakBranch) {
    damakBranch = await prisma.branch.create({
      data: {
        tenantId: sanskardipTenant.id,
        name: 'Damak',
        address: 'Damak, Jhapa, Nepal',
        latitude: 26.6667,
        longitude: 87.6833,
        radiusMeters: 500,
      },
    });
  }

  // Create roles
  let tenantAdminRole = await prisma.role.findFirst({
    where: { tenantId: sanskardipTenant.id, name: 'Tenant Admin' },
  });
  if (!tenantAdminRole) {
    tenantAdminRole = await prisma.role.create({
      data: {
        tenantId: sanskardipTenant.id,
        name: 'Tenant Admin',
        permissions: [
          'manage_branches', 'manage_staff', 'manage_courses', 'manage_billing',
          'view_reports', 'approve_petty_cash_l2', 'approve_social_media'
        ],
      },
    });
  }

  let branchAdminRole = await prisma.role.findFirst({
    where: { tenantId: sanskardipTenant.id, name: 'Branch Admin' },
  });
  if (!branchAdminRole) {
    branchAdminRole = await prisma.role.create({
      data: {
        tenantId: sanskardipTenant.id,
        name: 'Branch Admin',
        permissions: [
          'manage_staff', 'manage_courses', 'view_reports', 'approve_petty_cash_l1', 'approve_leave_l1'
        ],
      },
    });
  }

  let teacherRole = await prisma.role.findFirst({
    where: { tenantId: sanskardipTenant.id, name: 'Teacher' },
  });
  if (!teacherRole) {
    teacherRole = await prisma.role.create({
      data: {
        tenantId: sanskardipTenant.id,
        name: 'Teacher',
        permissions: [
          'mark_attendance', 'manage_homework', 'view_own_schedule', 'submit_lesson_update'
        ],
      },
    });
  }

  // 1. Tenant Admin
  const hash1 = await bcrypt.hash('TMSWelcome2413!', 10);
  const u1 = await prisma.user.upsert({
    where: { email: 'sanskardipoffice@gmail.com' },
    update: { passwordHash: hash1, status: 'ACTIVE' },
    create: {
      tenantId: sanskardipTenant.id,
      email: 'sanskardipoffice@gmail.com',
      firstName: 'Sanskardip',
      lastName: 'Office',
      phone: '9800000010',
      passwordHash: hash1,
      status: 'ACTIVE',
    },
  });
  const assign1 = await prisma.userRole.findFirst({
    where: { userId: u1.id, roleId: tenantAdminRole.id },
  });
  if (!assign1) {
    await prisma.userRole.create({
      data: { userId: u1.id, roleId: tenantAdminRole.id, branchId: null },
    });
  }

  // 2. Branch Manager
  const hash2 = await bcrypt.hash('Tms!886be88a0537A9', 10);
  const u2 = await prisma.user.upsert({
    where: { email: 'ui.manager@sanskardip.local' },
    update: { passwordHash: hash2, status: 'ACTIVE' },
    create: {
      tenantId: sanskardipTenant.id,
      email: 'ui.manager@sanskardip.local',
      firstName: 'Damak Branch',
      lastName: 'Manager',
      phone: '9800000011',
      passwordHash: hash2,
      status: 'ACTIVE',
    },
  });
  const assign2 = await prisma.userRole.findFirst({
    where: { userId: u2.id, roleId: branchAdminRole.id },
  });
  if (!assign2) {
    await prisma.userRole.create({
      data: { userId: u2.id, roleId: branchAdminRole.id, branchId: damakBranch.id },
    });
  }

  // 3. Teacher
  const hash3 = await bcrypt.hash('Tms!teacher2026A9', 10);
  const u3 = await prisma.user.upsert({
    where: { email: 'ui.teacher@sanskardip.local' },
    update: { passwordHash: hash3, status: 'ACTIVE' },
    create: {
      tenantId: sanskardipTenant.id,
      email: 'ui.teacher@sanskardip.local',
      firstName: 'Damak',
      lastName: 'Teacher',
      phone: '9800000012',
      passwordHash: hash3,
      status: 'ACTIVE',
    },
  });
  const assign3 = await prisma.userRole.findFirst({
    where: { userId: u3.id, roleId: teacherRole.id },
  });
  if (!assign3) {
    await prisma.userRole.create({
      data: { userId: u3.id, roleId: teacherRole.id, branchId: damakBranch.id },
    });
  }

  console.log('[seed] Sanskardip tenant ready.');
  console.log('  Accounts:');
  console.log('    Tenant Admin: sanskardipoffice@gmail.com / TMSWelcome2413!');
  console.log('    Branch Manager: ui.manager@sanskardip.local / Tms!886be88a0537A9');
  console.log('    Teacher: ui.teacher@sanskardip.local / Tms!teacher2026A9');
}

main()
  .catch((error) => {
    console.error('[seed] Failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
