# Staging-first delivery workflow

## Environments

| Environment | Git branch | Web | API |
| --- | --- | --- | --- |
| Staging | `staging` | `https://staging.sanskardipshikshalaya.com.np` | `https://api.staging.sanskardipshikshalaya.com.np` |
| Production | `main` | `https://tms.sanskardipshikshalaya.com.np` | `https://api.tms.sanskardipshikshalaya.com.np` |

Coolify must use two separate applications. Each application must have its own
PostgreSQL volume, credentials, Better Auth secret, webhook secret, domains,
and backups. Neither environment publishes PostgreSQL to the VPS host.

## Team workflow

1. Branch from the latest `staging` using `feature/<short-name>` or
   `fix/<short-name>`.
2. Make a focused change and run the relevant local checks.
3. Open a pull request into `staging`. Never open routine feature pull requests
   directly into `main`.
4. Merge only after CI and review pass. Coolify then deploys `staging`.
5. Verify the staging web application, `/api/health`, authentication, and the
   affected role/tenant/branch workflow.
6. Open one reviewed promotion pull request from `staging` into `main`.
7. Merge after approval. Coolify then deploys production from `main`.
8. Verify production health and the critical login/logout flow. Roll back in
   Coolify if validation fails; investigate on a fix branch and repeat staging.

Do not force-push, commit directly, or enable automatic deletion on `main` or
`staging`. Do not test migrations for the first time against production.

## Required GitHub branch protection

Configure rulesets for both `staging` and `main`:

- Require pull requests and at least one approval.
- Require the `Build, lint, schema, and authorization checks` status check.
- Require branches to be current before merging.
- Dismiss stale approvals after new commits.
- Block force pushes and branch deletion.
- Require conversation resolution.
- Restrict direct pushes to repository administrators responsible for recovery.

For `main`, allow pull requests only from `staging` as a team convention and
verify the source branch during review. GitHub rulesets should enforce this with
the repository's available plan/features when possible.

## Coolify configuration

- Enable deployment webhooks for `staging` and `main` only after branch
  protection is active.
- Route each web service to container port `80` and each API service to `3001`.
- Keep `SMS_PROVIDER=DISABLED` until Aakash SMS is provisioned. For live SMS,
  use `SMS_PROVIDER=AAKASH` with `AAKASH_SMS_AUTH_TOKEN`.
- Keep `PLATFORM_ADMIN_ENABLED=false` in both hosted environments.
- Take a verified database backup before migrations and production promotion.
- Configure the connectIPS reconciliation schedule only after UAT is enabled.

Local development still receives host ports through `compose.override.yml`.
Coolify explicitly deploys `compose.yml`, which exposes only internal container
ports and avoids collisions between staging and production.
