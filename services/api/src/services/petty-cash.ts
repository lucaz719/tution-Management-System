import { Prisma } from '@prisma/client';

export function pettyCashPeriod(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kathmandu', year: 'numeric', month: '2-digit' }).formatToParts(now);
  const year = parts.find(p => p.type === 'year')!.value;
  const month = parts.find(p => p.type === 'month')!.value;
  return { period: `${year}-${month}`, start: new Date(`${year}-${month}-01T00:00:00+05:45`), end: new Date(Date.UTC(Number(year), Number(month), 1) - 345 * 60_000) };
}

export async function branchAllowance(db: Prisma.TransactionClient, tenantId: string, branchId: string) {
  const { period, start, end } = pettyCashPeriod();
  const [policy, funding, usage] = await Promise.all([
    db.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { pettyCashCapNpr: true } }),
    db.pettyCashFunding.aggregate({ where: { tenantId, branchId, period, status: 'APPROVED' }, _sum: { amount: true } }),
    db.pettyCash.aggregate({ where: { tenantId, branchId, releasedAt: { gte: start, lt: end }, status: { in: ['RELEASED', 'RECEIPT_SUBMITTED', 'CLOSED'] } }, _sum: { amount: true } }),
  ]);
  const limit = policy.pettyCashCapNpr + Number(funding._sum.amount || 0);
  const used = Number(usage._sum.amount || 0);
  return { period, limit, used, available: Math.round((limit - used) * 100) / 100 };
}
