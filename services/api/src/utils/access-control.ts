import { UserPayload } from '@tms/types';

type RoleAssignment = Pick<UserPayload['roles'][number], 'roleName' | 'branchId'>;
type Actor = Pick<UserPayload, 'roles'>;

export interface ActorScope {
  tenantWide: boolean;
  branchIds: string[];
}

/** Resolve authorization scope exclusively from verified role assignments. */
export function resolveActorScope(actor: Actor): ActorScope {
  return {
    tenantWide: isTenantAdmin(actor),
    branchIds: managedBranchIds(actor),
  };
}

/** Throws when an actor attempts to operate outside their branch scope. */
export function requireBranchAccess(actor: Actor, branchId: string): void {
  if (!canAccessBranch(actor, branchId)) {
    throw new Error('Branch access denied.');
  }
}

export function isTenantAdmin(actor: Actor): boolean {
  return actor.roles.some((role: RoleAssignment) => role.roleName === 'Tenant Admin' && role.branchId === null);
}

export function managedBranchIds(actor: Actor): string[] {
  return actor.roles
    .filter((role: RoleAssignment) => role.roleName === 'Branch Admin' && Boolean(role.branchId))
    .map((role: RoleAssignment) => role.branchId as string);
}

export function canAccessBranch(actor: Actor, branchId: string): boolean {
  return isTenantAdmin(actor) || managedBranchIds(actor).includes(branchId);
}

interface PettyCashRequest {
  tenantId: string;
  branchId: string;
  status: string;
}

export function canApprovePettyCashL1(actor: Actor & Pick<UserPayload, 'tenantId'>, request: PettyCashRequest): boolean {
  return actor.tenantId === request.tenantId
    && request.status === 'PENDING'
    && managedBranchIds(actor).includes(request.branchId);
}

export function canReleasePettyCash(actor: Actor & Pick<UserPayload, 'tenantId'>, request: PettyCashRequest): boolean {
  return actor.tenantId === request.tenantId
    && request.status === 'APPROVED_LEVEL1'
    && isTenantAdmin(actor);
}
