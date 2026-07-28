import 'dotenv/config';
import prisma from '../utils/db';
import { getBillingPeriod } from '../utils/nepali';
import { getSmsSender } from '../utils/sms';

const FIXTURE_DOMAIN = 'fixture.tms.local';
const RETRY_STUDENT_NUMBERS = new Set([1, 3]);

function fixtureNumber(email: string): number | undefined {
  const match = email.match(/-student-(\d+)@fixture\.tms\.local$/);
  return match ? Number(match[1]) : undefined;
}

async function main(): Promise<void> {
  if (process.env.SMS_FIXTURE_RETRY_MODE !== 'true') {
    throw new Error('Set SMS_FIXTURE_RETRY_MODE=true to resend the two previously rejected invoice notifications.');
  }
  if ((process.env.SMS_PROVIDER || '').toUpperCase() !== 'AAKASH') {
    throw new Error('Set SMS_PROVIDER=AAKASH before retrying live fixture notifications.');
  }

  const tenant = await prisma.tenant.findFirst({
    where: { name: { startsWith: 'TMS SMS Fixture ' } },
    orderBy: { createdAt: 'desc' },
  });
  if (!tenant) throw new Error('No SMS fixture tenant was found.');

  const invoices = await prisma.invoice.findMany({
    where: { tenantId: tenant.id },
    include: {
      student: {
        include: {
          user: true,
          studentParents: { include: { parent: { include: { user: true } } } },
        },
      },
    },
  });
  const retries = invoices.filter((invoice) => {
    const number = fixtureNumber(invoice.student.user.email);
    return number !== undefined && RETRY_STUDENT_NUMBERS.has(number);
  });
  if (retries.length !== 2) throw new Error('The two expected fixture invoices were not found.');

  const sender = getSmsSender();
  for (const invoice of retries) {
    const number = fixtureNumber(invoice.student.user.email)!;
    const parentPhone = invoice.student.studentParents[0]?.parent.user.phone;
    if (!parentPhone) throw new Error(`No parent phone was found for Test Student ${number}.`);

    const period = await getBillingPeriod(invoice.billingCycleStart);
    const result = await sender.sendSms(
      parentPhone,
      `TMS TEST INVOICE: Test Student ${number} has an invoice of NPR ${invoice.netPayable} for ${period.label}. No payment is required.`
    );
    if (!result.success) throw new Error(result.error || `Invoice SMS retry failed for Test Student ${number}.`);
  }

  console.log('Aakash accepted the two previously rejected fixture invoice messages.');
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
