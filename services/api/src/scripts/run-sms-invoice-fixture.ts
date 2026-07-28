import 'dotenv/config';
import crypto from 'crypto';
import prisma from '../utils/db';
import { getBillingPeriod } from '../utils/nepali';
import { getSmsSender } from '../utils/sms';

const FIXTURE_PASSWORD_HASH = 'test-fixture-not-for-login';
const FIXTURE_DOMAIN = 'fixture.tms.local';

function readFixturePhones(): string[] {
  const phones = (process.env.SMS_FIXTURE_PHONE_NUMBERS || '')
    .split(',')
    .map((phone) => phone.trim())
    .filter(Boolean);

  if (phones.length !== 3 || new Set(phones).size !== 3) {
    throw new Error('SMS_FIXTURE_PHONE_NUMBERS must contain exactly three distinct phone numbers.');
  }

  return phones;
}

async function main(): Promise<void> {
  if (process.env.SMS_FIXTURE_TEST_MODE !== 'true') {
    throw new Error('Set SMS_FIXTURE_TEST_MODE=true to create local SMS invoice fixtures.');
  }
  if ((process.env.SMS_PROVIDER || '').toUpperCase() !== 'AAKASH') {
    throw new Error('Set SMS_PROVIDER=AAKASH before running the live fixture test.');
  }

  const phones = readFixturePhones();
  const runId = crypto.randomUUID().slice(0, 8);
  const period = await getBillingPeriod();
  const tenant = await prisma.tenant.create({
    data: {
      name: `TMS SMS Fixture ${runId}`,
      // A generated 9-digit value keeps the fixture isolated from real tenants.
      panNumber: `${Date.now()}`.slice(-9),
      status: 'INACTIVE',
    },
  });

  try {
    const branch = await prisma.branch.create({
      data: {
        tenantId: tenant.id,
        name: 'SMS Test Branch',
        address: 'Local test fixture only',
        latitude: 27.7172,
        longitude: 85.324,
      },
    });
    const teacher = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: `sms-test-${runId}-teacher@${FIXTURE_DOMAIN}`,
        passwordHash: FIXTURE_PASSWORD_HASH,
        firstName: 'SMS',
        lastName: 'Test Teacher',
        phone: '9800000000',
        status: 'INACTIVE',
      },
    });
    const course = await prisma.course.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        name: 'SMS Fixture Course',
        type: 'REGULAR',
        feeStructure: { monthlyBase: 1500 },
      },
    });
    const classroom = await prisma.class.create({
      data: {
        courseId: course.id,
        branchId: branch.id,
        teacherId: teacher.id,
        name: 'SMS Fixture Class',
        schedule: { days: ['TEST'], time: '00:00' },
      },
    });
    const session = await prisma.teacherSession.create({
      data: {
        teacherId: teacher.id,
        classId: classroom.id,
        date: new Date(),
        status: 'PRESENT_UPDATE_PENDING',
      },
    });

    const fixtures = await Promise.all(phones.map(async (phone, index) => {
      const number = index + 1;
      const parentUser = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: `sms-test-${runId}-parent-${number}@${FIXTURE_DOMAIN}`,
          passwordHash: FIXTURE_PASSWORD_HASH,
          firstName: 'Test',
          lastName: `Parent ${number}`,
          phone,
          status: 'INACTIVE',
          parent: { create: {} },
        },
        include: { parent: true },
      });
      const studentUser = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: `sms-test-${runId}-student-${number}@${FIXTURE_DOMAIN}`,
          passwordHash: FIXTURE_PASSWORD_HASH,
          firstName: 'Test',
          lastName: `Student ${number}`,
          phone: `981000000${number}`,
          status: 'INACTIVE',
          student: {
            create: {
              admissionDate: new Date(),
              emergencyContact: phone,
            },
          },
        },
        include: { student: true },
      });

      if (!parentUser.parent || !studentUser.student) {
        throw new Error('Unable to create the parent/student fixture records.');
      }

      await prisma.studentParent.create({
        data: { studentId: studentUser.student.id, parentId: parentUser.parent.id },
      });
      const amount = 1500 + index * 250;
      const invoice = await prisma.invoice.create({
        data: {
          tenantId: tenant.id,
          studentId: studentUser.student.id,
          amount,
          discount: 0,
          fine: 0,
          netPayable: amount,
          billingCycleStart: period.cycleStart,
          billingCycleEnd: period.cycleEnd,
          dueDate: period.dueDate,
          status: 'UNPAID',
        },
      });

      return { number, phone, studentId: studentUser.student.id, invoiceId: invoice.id, amount };
    }));

    const absentFixture = fixtures[crypto.randomInt(fixtures.length)];
    await prisma.studentAttendance.create({
      data: {
        studentId: absentFixture.studentId,
        classId: classroom.id,
        sessionId: session.id,
        date: new Date(),
        status: 'ABSENT',
        markedBy: teacher.id,
      },
    });

    const sender = getSmsSender();
    const invoiceResults = await Promise.all(fixtures.map((fixture) => sender.sendSms(
      fixture.phone,
      `TMS TEST INVOICE: Test Student ${fixture.number} has an invoice of NPR ${fixture.amount} for ${period.label}. No payment is required.`
    )));
    const absenceResult = await sender.sendSms(
      absentFixture.phone,
      `TMS TEST ATTENDANCE: Test Student ${absentFixture.number} is marked absent today. No action is required.`
    );
    const failed = [...invoiceResults, absenceResult].filter((result) => !result.success);

    if (failed.length > 0) {
      throw new Error(`${failed.length} SMS request(s) were not accepted: ${failed[0].error || 'Unknown error'}`);
    }

    console.log(`Created 3 isolated student-parent-invoice fixtures and one absence record for run ${runId}.`);
    console.log('Aakash accepted 3 invoice messages and 1 absence message.');
  } catch (error) {
    // Keep the fixture tenant inactive and visible for local inspection if a
    // downstream SMS request fails; no real institution data is affected.
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
