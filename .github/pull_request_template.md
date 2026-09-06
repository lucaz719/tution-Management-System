## Summary

Describe the user-visible and operational changes.

## Validation

- [ ] `npm ci`
- [ ] `npm run build`
- [ ] `npm run lint --workspace=web`
- [ ] Relevant API tests pass
- [ ] Database migration reviewed and tested, or no migration is included
- [ ] No secrets, credentials, or production data are committed

## Promotion

- [ ] This PR targets `staging` first
- [ ] Staging deployment and `/api/health` verified
- [ ] Role/tenant/branch smoke checks completed where relevant
- [ ] Rollback impact considered

Production promotion must be a separate reviewed pull request from `staging` to
`main` after staging approval.
