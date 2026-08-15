# CitaFuego V1.0 Release Acceptance

## Status vocabulary

- **Release Candidate READY**: source, dependency lock, CI, tests, production build, additive database migrations and security invariants are verified.
- **Production deployment READY**: hosting platform reports the intended production deployment as READY and production secrets are configured.
- **Production LIVE**: custom domain, HTTPS, DNS, Auth email, health check and production E2E have all passed.

These states must never be conflated.

## Current RC acceptance

### Completed

- Full Next.js/TypeScript production source restored into `huoago/citafuego`.
- Real Supabase Auth/SSR/Magic Link code paths.
- Server-side 18+ registration gate and private DOB storage.
- Onboarding via `save_onboarding_profile()`.
- Private profile-photo and verification-selfie media flows.
- Manual Trust & Safety photo and selfie verification.
- Paginated real Discovery; no demo users, fake likes or fake matches.
- Like/Pass/SuperFuego, idempotent Match + Conversation.
- Gold Who Likes You, Plus/Gold Rewind and Premium filters.
- Realtime Chat, message moderation, held-message privacy and database rate limits.
- Report / Block / Unblock flows.
- Trust & Safety admin read models, sanctions and audit log.
- Provider-adapter moderation architecture.
- Catalog-backed Premium model.
- Legal/community/safety/help pages.
- GitHub Actions CI, guarded production deploy workflow and daily production health workflow.
- `package-lock.json` committed; CI uses `npm ci`.

### Production database

Production Supabase: `stfbybkutnoqoxhqxyou`.

- Historical migrations through `020` are treated as immutable live history.
- RC additive migrations `021_admin_backoffice`, `022_realtime_and_rate_limits`, and `023_superfuego_entitlements` have been applied successfully.
- `messages` is in `supabase_realtime` publication.
- Rate-limit table/functions exist.
- Admin RC read/write RPCs exist.
- SuperFuego entitlement guard is active.
- Privileged public-schema `SECURITY DEFINER` functions executable by `anon`: **0**.

### CI/build evidence

Final release-head quality gate runs:

- `npm ci`: pass
- repository secret scan: pass
- ESLint: pass
- `tsc --noEmit`: pass
- Node unit/security tests: **31 passed / 0 failed**
- Next.js production build: pass
- npm audit observed during clean install: 0 vulnerabilities at this checkpoint

## Not yet production-live

The following remain external production acceptance blockers:

1. Production SMTP is not configured/verified; Supabase built-in test mail is not accepted as production SMTP.
2. Production Supabase currently has no controlled Auth test users, so a real two-account production E2E has not been run.
3. No production Trust & Safety Auth user is available to assign an admin role yet.
4. The current connected Vercel team cannot see the previously completed CitaFuego project, so Production deployment READY cannot be verified from this connection.
5. Alibaba Cloud authoritative DNS write access is not connected; `citafuego.com` DNS/TLS propagation cannot be completed or verified from this environment.

Therefore the correct current label is **Release Candidate READY**, not `citafuego.com LIVE`.

## Rollback

Application rollback:

1. Redeploy the last known-good `main` commit / previous production deployment.
2. Disable affected feature flags if a newly deployed capability must be suppressed immediately.

Database rollback:

- Never rewrite applied migrations.
- Prefer forward-fix migrations.
- If compensation is required for `021`–`023`, author a new reviewed compensating migration, preserve audit evidence, and avoid destructive data changes unless specifically approved.

## Production live acceptance checklist

Before saying `citafuego.com` is live, verify all:

- [ ] Production hosting deployment state READY
- [ ] Production secrets configured
- [ ] `citafuego.com` attached to intended project
- [ ] authoritative DNS propagated
- [ ] valid HTTPS certificate
- [ ] `https://citafuego.com/api/health` returns 200
- [ ] production SMTP delivers Magic Link to controlled test mailboxes
- [ ] two controlled 18+ accounts complete signup/onboarding/photos/verification
- [ ] both profiles activate
- [ ] reciprocal Discovery works
- [ ] mutual Like creates exactly one Match and Conversation
- [ ] Realtime Chat works
- [ ] held content remains sender-only
- [ ] Block immediately disables further messaging
- [ ] Report creates correct Trust & Safety evidence
- [ ] Trust & Safety admin can review and audit allowed evidence
