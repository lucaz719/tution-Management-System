# Tenant Admin frontend API gaps

Verified against the mounted API routes on 2026-07-29. The frontend intentionally shows unavailable states or omits navigation for these workflows.

## Pending refund queue

### Required operation
List tenant refund requests, filterable by status and branch.

### Proposed contract
`GET /api/courses/refunds?status=PENDING&branchId=...`

### Required response fields
`id`, student, course, branch, requested amount, reason, status, request date, requester, approval history, policy snapshot, settlement reference.

### Authorization
`TENANT_ADMIN`, current tenant only.

### UI blocked
Refund queue, detail drawer, approval action, and post-action refresh. Existing approve/settle mutations are not surfaced without a safe discovery contract.

## Long-sick leave Level 2 queue

### Required operation
List long-sick leave requests that already have Branch Admin Level 1 approval.

### Proposed contract
`GET /api/leaves?type=LONG_SICK&status=APPROVED_LEVEL1`

### Required response fields
Leave ID, staff identity, branch, dates, reason, document metadata, policy snapshot, L1 actor/time/remarks.

### Authorization
`TENANT_ADMIN`, current tenant only.

### UI blocked
Eligible Level 2 queue and prior-step detail. The approve mutation alone is insufficient for discovery.

## Staff exit settlement queue

### Required operation
List and retrieve exit cases that completed Branch Admin clearance.

### Proposed contract
`GET /api/hr/exits?status=CLEARED` and `GET /api/hr/exits/:id`

### Required response fields
Exit ID, staff, branch, clearance checklist/history, salary components, allowances, dues, calculated settlement, status.

### Authorization
`TENANT_ADMIN`, current tenant only.

### UI blocked
Final-settlement queue and review screen.

## Certificate template management

### Required operation
List and retrieve master templates after creation.

### Proposed contract
`GET /api/certificates/templates` and `GET /api/certificates/templates/:id`

### Required response fields
Template ID, name, type, layout configuration, allowed fields, created/updated metadata.

### Authorization
`TENANT_ADMIN`, current tenant only.

### UI blocked
Usable template-management history, selection, and safe edit workflow. The create-only endpoint is insufficient.

## Calendar lifecycle

### Required operation
Update/delete tenant-wide events while enforcing branch-level immutability.

### Proposed contract
`PUT /api/academic-events/:id`, `DELETE /api/academic-events/:id`

### Authorization
Tenant Admin for tenant-wide events; Branch Admin cannot mutate tenant-wide events.

### UI blocked
Edit/cancel controls. The frontend currently supports create and list only.
