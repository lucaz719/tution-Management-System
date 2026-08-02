import 'dotenv/config';
import prisma from '../utils/db';
import { reconcilePendingConnectIps } from '../utils/connectips';

function reconciliationLimit(): number {
  const configured = process.env.CONNECTIPS_RECONCILIATION_LIMIT?.trim();
  if (!configured) return 50;
  if (!/^\d+$/.test(configured)) {
    throw new Error('CONNECTIPS_RECONCILIATION_LIMIT must be a whole number between 1 and 100.');
  }
  const limit = Number(configured);
  if (limit < 1 || limit > 100) {
    throw new Error('CONNECTIPS_RECONCILIATION_LIMIT must be between 1 and 100.');
  }
  return limit;
}

async function main(): Promise<void> {
  // Safe default for local development and deployments before NCHL onboarding.
  if (process.env.CONNECTIPS_ENABLED !== 'true') {
    console.log(JSON.stringify({ event: 'CONNECTIPS_RECONCILIATION_SKIPPED', reason: 'disabled' }));
    return;
  }

  const result = await reconcilePendingConnectIps({ limit: reconciliationLimit() });
  console.log(JSON.stringify({ event: 'CONNECTIPS_RECONCILIATION_COMPLETE', ...result }));
}

main()
  .catch((error: unknown) => {
    console.error(JSON.stringify({
      event: 'CONNECTIPS_RECONCILIATION_FAILED',
      error: error instanceof Error ? error.message : 'Unknown error',
    }));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
