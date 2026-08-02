import assert from 'node:assert/strict';
import prisma from './db';
import { reconcilePendingConnectIps } from './connectips';

async function verifyTenantScope(): Promise<void> {
  const paymentAttempt = prisma.paymentAttempt as any;
  const originalFindMany = paymentAttempt.findMany;
  let query: any;

  paymentAttempt.findMany = async (args: any) => {
    query = args;
    return [];
  };

  try {
    const result = await reconcilePendingConnectIps({ tenantId: 'tenant-a', limit: 150 });
    assert.deepEqual(result, { checked: 0, confirmed: 0 });
    assert.equal(query.where.tenantId, 'tenant-a', 'tenant-scoped runs must never query another institution');
    assert.equal(query.take, 100, 'reconciliation batches must remain bounded');
  } finally {
    paymentAttempt.findMany = originalFindMany;
  }
}

verifyTenantScope()
  .then(() => console.log('connectIPS reconciliation scope tests passed'))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
