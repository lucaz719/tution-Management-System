import assert from 'node:assert/strict';
import type { UserPayload } from '@tms/types';
import prisma from '../utils/db';
import { pettyCashPeriod } from '../services/petty-cash';

let actor: UserPayload = { id: 'admin', tenantId: 'tenant-a', email: 'test@example.test', firstName: 'A', lastName: 'B', roles: [{ roleName: 'Branch Admin', branchId: 'branch-a', permissions: [] }] };
const authPath = require.resolve('../utils/auth');
require.cache[authPath] = { id: authPath, filename: authPath, loaded: true, exports: { auth: { api: { getSession: async () => ({ user: actor }) } } } } as NodeModule;
const router = require('./finances').default;
let record: any;
let used = 0;
let extra = 0;
let funding: any;
let locked = false;
let tail = Promise.resolve();
(prisma as any).$transaction = async (operation: any) => {
  const previous = tail;
  let release!: () => void;
  tail = new Promise<void>(resolve => { release = resolve; });
  await previous;
  try { return await operation(prisma); } finally { locked = false; release(); }
};
(prisma as any).$queryRaw = async () => { locked = true; return [{ id: 'branch-a' }]; };
prisma.tenant.findUniqueOrThrow = (async () => ({ pettyCashCapNpr: 1000 })) as any;
prisma.branch.findFirst = (async ({ where }: any) => where.id === 'branch-a' && where.tenantId === 'tenant-a' ? { id: 'branch-a' } : null) as any;
prisma.pettyCash.findUnique = (async () => ({ ...record })) as any;
prisma.pettyCash.findFirst = (async ({ where }: any) => record.tenantId === where.tenantId ? { ...record } : null) as any;
prisma.pettyCash.aggregate = (async ({ where }: any) => {
  assert.equal(where.branchId, 'branch-a'); assert.equal(where.tenantId, 'tenant-a');
  assert.ok(where.releasedAt.gte); return { _sum: { amount: used } };
}) as any;
prisma.pettyCash.updateMany = (async ({ where, data }: any) => {
  if (where.status !== record.status) return { count: 0 };
  if (data.status === 'RELEASED') { assert.ok(locked); used += Number(record.amount); }
  Object.assign(record, data); return { count: 1 };
}) as any;
prisma.pettyCashFunding.aggregate = (async () => ({ _sum: { amount: extra } })) as any;
prisma.pettyCashFunding.create = (async ({ data }: any) => funding = { id: 'funding-a', status: 'PENDING', ...data }) as any;
prisma.pettyCashFunding.findFirst = (async ({ where }: any) => funding?.tenantId === where.tenantId ? { ...funding } : null) as any;
prisma.pettyCashFunding.updateMany = (async ({ data }: any) => {
  assert.ok(locked);
  if (funding.status !== 'PENDING') return { count: 0 };
  Object.assign(funding, data); if (data.status === 'APPROVED') extra += Number(funding.amount);
  return { count: 1 };
}) as any;
async function invoke(path: string, body: any = {}) {
  const route = router.stack.find((layer: any) => layer.route?.path === path && layer.route.methods.post).route;
  const req: any = { headers: {}, body, params: { id: 'record-a' } };
  let status = 200; let payload: any;
  const res: any = { status(code: number) { status = code; return this; }, json(value: any) { payload = value; return this; } };
  for (const layer of route.stack) { let next = false; await layer.handle(req, res, () => { next = true; }); if (!next) break; }
  return { status, payload };
}
function reset(amount = 400) { record = { id: 'record-a', tenantId: 'tenant-a', branchId: 'branch-a', status: 'PENDING', amount, approvalChain: [] }; }
async function main() {
  assert.equal(pettyCashPeriod(new Date('2026-08-31T18:15:00Z')).period, '2026-09');
  assert.equal(pettyCashPeriod(new Date('2026-08-31T18:14:59Z')).period, '2026-08');
  reset();
  assert.equal((await invoke('/petty-cash/approve-l1/:id')).payload.pettyCash.status, 'RELEASED');
  assert.equal(used, 400);
  assert.notEqual((await invoke('/petty-cash/approve-l1/:id')).status, 200);
  reset(700);
  assert.equal((await invoke('/petty-cash/approve-l1/:id')).payload.pettyCash.status, 'APPROVED_LEVEL1');
  assert.equal(used, 400, 'escalation must not spend allowance');
  reset(); record.branchId = 'branch-b';
  assert.equal((await invoke('/petty-cash/approve-l1/:id')).status, 403);
  reset(); record.tenantId = 'tenant-b';
  assert.equal((await invoke('/petty-cash/approve-l1/:id')).status, 403);
  reset();
  assert.equal((await invoke('/petty-cash/decide/:id', { action: 'REJECT', remarks: 'Unneeded' })).status, 200);
  assert.equal(record.status, 'REJECTED');
  assert.equal((await invoke('/petty-cash/funding', { branchId: 'branch-b', amount: 500, purpose: 'Supplies' })).status, 403);
  assert.equal((await invoke('/petty-cash/funding', { branchId: 'branch-a', amount: -1, purpose: 'Supplies' })).status, 400);
  assert.equal((await invoke('/petty-cash/funding', { branchId: 'branch-a', amount: 500, purpose: 'Supplies' })).status, 201);
  assert.equal((await invoke('/petty-cash/funding/:id/decide', { action: 'APPROVE' })).status, 403);
  actor.roles = [{ roleName: 'Tenant Admin', branchId: null, permissions: [] }];
  assert.equal((await invoke('/petty-cash/funding/:id/decide', { action: 'APPROVE' })).status, 200);
  assert.equal(extra, 500);
  assert.equal((await invoke('/petty-cash/funding/:id/decide', { action: 'APPROVE' })).status, 409);
  reset();
  assert.equal((await invoke('/petty-cash/approve-l2/:id')).status, 200, 'tenant can resolve legacy pending records');
  actor.roles = [{ roleName: 'Branch Admin', branchId: 'branch-a', permissions: [] }];
  reset(700);
  assert.equal((await invoke('/petty-cash/approve-l1/:id')).payload.pettyCash.status, 'RELEASED', 'approved funding increases branch allowance');
  reset(1);
  assert.equal((await invoke('/petty-cash/approve-l1/:id')).payload.pettyCash.status, 'APPROVED_LEVEL1', 'exactly exhausted allowance escalates');
  used = 0; reset(100);
  const results = await Promise.all([invoke('/petty-cash/approve-l1/:id'), invoke('/petty-cash/approve-l1/:id')]);
  assert.equal(results.filter(r => r.status === 200).length, 1); assert.equal(used, 100);
  reset(); record.status = 'RECEIPT_SUBMITTED';
  assert.equal((await invoke('/petty-cash/close/:id')).status, 200);
  console.log('Petty cash route tests passed: scopes, balances, escalation, funding, legacy approvals, duplicate decisions and receipts.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
