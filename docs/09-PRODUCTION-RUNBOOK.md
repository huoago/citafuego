# CitaFuego Production Runbook

## Release definition

`Release Candidate READY` and `Production LIVE` are separate states.

### RC READY requires
- GitHub CI green: clean install, secret scan, lint, typecheck, tests, Next.js build.
- Supabase additive migrations applied in order and validated.
- No high-severity security finding.
- `anon` executable privileged `SECURITY DEFINER` functions = 0.
- Rollback plan documented.

### Production LIVE additionally requires
- production deployment state READY
- `citafuego.com` attached to production
- valid TLS/HTTPS
- DNS propagated
- `/api/health` HTTP 200
- production SMTP working
- real production two-account E2E passed

## Current database baseline

The production Supabase project `stfbybkutnoqoxhqxyou` is the source of truth. Production migration history currently extends through `020`. Never edit, delete, renumber, or reuse an already-applied migration number.

This RC introduces only the next additive changes:

- `021_admin_backoffice.sql`
- `022_realtime_and_rate_limits.sql`
- `023_superfuego_entitlements.sql`

## Pre-release checklist

1. Confirm `main` has the approved RC commit.
2. Confirm no secrets are committed: `node scripts/check-no-secrets.mjs`.
3. Confirm CI status is green for the exact commit.
4. Compare Supabase production migration history with repository metadata. Treat production through `020` as immutable history.
5. Apply only pending additive migrations `021`–`023`, in order, after CI is green.
6. Re-run database security check:

```sql
select count(*) filter (
  where has_function_privilege('anon', p.oid, 'EXECUTE')
) as anon_security_definer_executable
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname='public' and p.prosecdef=true;
```

Expected: `0`.

7. Set production public env vars and secrets in the deployment platform secret store.
8. Configure production SMTP in Supabase Auth.
9. Configure Supabase Auth Site URL and redirect allow-list for `https://citafuego.com/auth/confirm`.
10. Deploy. Treat CREATED/BUILDING as not ready.
11. Wait for deployment READY.
12. Connect custom domain and validate DNS/TLS.
13. Run production smoke: `npm run e2e:smoke` with `CITAFUEGO_BASE_URL=https://citafuego.com`.
14. Execute human two-account E2E.

## Production E2E

Use two controlled adult test accounts. Do not use fabricated public profiles.

- Account A and B receive real Auth email.
- Both complete 18+ registration.
- Both complete onboarding and legal consent.
- Upload two photos each; Trust & Safety approves.
- Complete random-action selfie verification; Trust & Safety approves.
- Both become `active`.
- Discovery shows only reciprocal eligible profiles.
- A likes B; B likes A.
- Exactly one match and one conversation exist.
- Chat sends/receives in realtime.
- A blocks B and messaging immediately stops.
- Report path creates a report without revealing the block to B.

## Environment variables

Public:
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Server-only / secret-store only:
- `SUPABASE_SECRET_KEY` only if an explicitly reviewed server operation truly requires it; current app paths are designed not to require service-role access.
- moderation provider secrets
- billing provider secrets
- SMTP credentials are configured in Supabase, not exposed to browser code.

## Rollback order

1. Roll back the application deployment first.
2. Disable affected feature flags if a backend capability must remain dormant.
3. Prefer forward-fix database migrations. Do not edit an applied migration in place.
4. For a required database rollback, write and review a new compensating migration; preserve audit evidence and data before destructive changes.

## Incident rule

If authentication, privacy isolation, RLS, payments, moderation, or age controls behave unexpectedly: stop promotion, disable affected feature via feature flag where possible, preserve logs/audit evidence, and roll back application deployment before attempting risky production hotfixes.
