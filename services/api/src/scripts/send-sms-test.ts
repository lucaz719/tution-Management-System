import 'dotenv/config';
import { getSmsSender } from '../utils/sms';

async function main(): Promise<void> {
  const recipients = (process.env.SMS_TEST_TO || '')
    .split(',')
    .map((recipient) => recipient.trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    throw new Error('SMS_TEST_TO must contain at least one phone number. Separate multiple numbers with commas.');
  }
  if ((process.env.SMS_PROVIDER || '').toUpperCase() !== 'AAKASH') {
    throw new Error('Set SMS_PROVIDER=AAKASH before sending a real SMS test.');
  }

  const sender = getSmsSender();
  const message = 'Tuition Management System test: Parent and student notification service is active. No action is needed.';
  const results = await Promise.all(recipients.map((recipient) => sender.sendSms(recipient, message)));
  const failures = results.filter((result) => !result.success);

  if (failures.length > 0) {
    throw new Error(`${failures.length} of ${recipients.length} test SMS request(s) failed: ${failures[0].error || 'Unknown error'}`);
  }

  console.log(`${recipients.length} test SMS request(s) accepted by Aakash.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
