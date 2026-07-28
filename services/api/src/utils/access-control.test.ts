import assert from 'node:assert/strict';
import {
  canAccessBranch,
  canApprovePettyCashL1,
  canReleasePettyCash,
  isTenantAdmin,
  managedBranchIds,
  resolveActorScope,
} from './access-control';
import { ROLE_PERMISSIONS } from './roles';

const tenantAdmin = {
  tenantId: 'tenant-a',
  roles: [{ roleName: 'Tenant Admin', branchId: null, permissions: [] }],
};

const branchAdmin = {
  tenantId: 'tenant-a',
  roles: [{ roleName: 'Branch Admin', branchId: 'branch-a', permissions: ['approve_petty_cash_l1'] }],
};

assert.equal(isTenantAdmin(tenantAdmin), true, 'a tenant-wide Tenant Admin has institution authority');
assert.equal(isTenantAdmin(branchAdmin), false, 'a Branch Admin is not a Tenant Admin');
assert.deepEqual(managedBranchIds(branchAdmin), ['branch-a'], 'branch scope comes from the signed role assignment');
assert.deepEqual(resolveActorScope(branchAdmin), { tenantWide: false, branchIds: ['branch-a'] });
assert.equal(canAccessBranch(tenantAdmin, 'branch-b'), true, 'Tenant Admin may operate in any branch in the institution');
assert.equal(canAccessBranch(branchAdmin, 'branch-a'), true, 'Branch Admin may operate in their assigned branch');
assert.equal(canAccessBranch(branchAdmin, 'branch-b'), false, 'Branch Admin cannot operate in another branch');
assert.equal(
  canApprovePettyCashL1(branchAdmin, { tenantId: 'tenant-a', branchId: 'branch-a', status: 'PENDING' }),
  true,
  'Branch Admin may provide L1 approval for a pending request in their branch',
);
assert.equal(
  canApprovePettyCashL1(branchAdmin, { tenantId: 'tenant-a', branchId: 'branch-b', status: 'PENDING' }),
  false,
  'Branch Admin may not approve petty cash for another branch',
);
assert.equal(
  canReleasePettyCash(branchAdmin, { tenantId: 'tenant-a', branchId: 'branch-a', status: 'APPROVED_LEVEL1' }),
  false,
  'Branch Admin may never release petty-cash funds',
);
assert.equal(
  canReleasePettyCash(tenantAdmin, { tenantId: 'tenant-a', branchId: 'branch-a', status: 'APPROVED_LEVEL1' }),
  true,
  'Tenant Admin releases only L1-approved petty cash',
);
assert.equal(
  (ROLE_PERMISSIONS['Branch Admin'] as readonly string[]).includes('view_reports'),
  false,
  'Branch Admin does not receive tenant-wide finance reporting access',
);

console.log('access-control tests passed');
