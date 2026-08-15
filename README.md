# CitaFuego V1.0 Release Candidate

**CitaFuego — Conoce. Conecta. Enciende la chispa.**

CitaFuego is a mobile-first, Spanish-language, 18+ local dating and social discovery platform launching in Lima Metropolitana, Peru. It is designed for real people to discover compatible adults nearby, match, chat safely, and move toward real-world dates.

CitaFuego is **not** an escort marketplace, prostitution service, paid-sex marketplace, sugar-dating-for-payment product, pornography platform, or a service for minors.

## Release status

This repository is the production Release Candidate for CitaFuego V1.0. The application is wired to the existing production Supabase project and preserves the established database/RLS/security model.

- Supabase project ref: `stfbybkutnoqoxhqxyou`
- Production app URL target: `https://citafuego.com`
- Primary locale: Spanish (`es-PE`)
- Launch market: Lima Metropolitana, Peru
- Minimum age: 18+
- Production database migrations through `020`: already applied/stable — **do not edit or reuse their numbers**
- RC database changes: additive migrations `021`–`023`

A successful CI build means **Release Candidate READY**, not that production is live. Production is only considered live after deployment READY, custom domain + HTTPS, DNS propagation, production Auth email, health check 200, and production E2E validation.

## Core funnel

`Signup → 18+ gate → Onboarding → Photo review → Selfie verification → Active profile → Discovery → Like → Match → Chat → Real date`

## Tech stack

- Next.js 16 App Router
- React 19 + TypeScript (strict)
- Supabase Auth (Magic Link + SSR cookie session)
- Supabase PostgreSQL + RLS
- Supabase private Storage
- Supabase Realtime for chat
- Sharp for image decoding/sanitization/re-encoding
- Node test runner for domain/security contract tests
- GitHub Actions for CI quality gates

## Local setup

Requirements: Node.js 22+ and npm.

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Required public configuration:

```env
NEXT_PUBLIC_APP_URL=https://citafuego.com
NEXT_PUBLIC_SUPABASE_URL=https://stfbybkutnoqoxhqxyou.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

Never commit `SUPABASE_SECRET_KEY`, service-role keys, SMTP passwords, Alibaba Cloud secrets, payment private keys, or moderation-provider private credentials.

## Quality gates

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

The GitHub CI workflow runs the same gates. Security contracts additionally protect core invariants such as:

- under-18 signup rejected server-side
- private birth date/location never exposed in Discovery
- no mock users/likes/matches
- private photo/selfie buckets
- reciprocal Discovery filters
- match/conversation idempotency
- held messages hidden from recipients
- server-side Premium gating
- Trust & Safety RBAC
- anonymous execution of privileged `SECURITY DEFINER` RPCs remains zero

## Repository structure

```text
src/app/                 Next.js routes and API handlers
src/components/          UI components
src/lib/                 Supabase, domain, billing and moderation code
src/server/              Server-only contracts
supabase/migrations/     Production-compatible SQL migrations
supabase/seed.sql        Reference seed data
tests/                   Unit + security contract tests
e2e/                     Production smoke checks
scripts/                 Security/release helper scripts
docs/                    Product, architecture and operating runbooks
.github/workflows/        CI/deployment/health workflows
```

## Database migration truth

The live Supabase project is the source of truth for already-applied migration numbers. At this RC checkpoint it contains production history through `020`, including historical admin/media/rate-limit hardening. Those applied migrations must not be rewritten.

Repository migrations `021_admin_backoffice.sql`, `022_realtime_and_rate_limits.sql`, and `023_superfuego_entitlements.sql` are the next additive RC changes. Apply them only after the exact RC commit is green in CI, then re-run the database security checks.

## Production operations

Read these before release:

- [`docs/09-PRODUCTION-RUNBOOK.md`](docs/09-PRODUCTION-RUNBOOK.md)
- [`docs/10-SMTP.md`](docs/10-SMTP.md)
- [`docs/11-SECURITY-REVIEW.md`](docs/11-SECURITY-REVIEW.md)
- [`docs/12-ROLLBACK.md`](docs/12-ROLLBACK.md)
- [`docs/13-DAILY-MAINTENANCE.md`](docs/13-DAILY-MAINTENANCE.md)

## Legal and safety routes

- `/terms`
- `/privacy`
- `/safety`
- `/community-guidelines`
- `/help`

The Spanish product routes `/terminos`, `/privacidad`, and `/seguridad` remain supported for compatibility.

## Deployment truth rule

Never report `citafuego.com` as live merely because a build or deployment was created. Live acceptance requires all of the following:

1. Production deployment reports READY.
2. `citafuego.com` is attached to the intended production project.
3. HTTPS certificate is valid.
4. Authoritative DNS has propagated.
5. `/api/health` returns HTTP 200 on the custom domain.
6. Production Magic Link email is delivered through configured production SMTP.
7. Two-account production E2E completes signup → activation → mutual match → chat → report/block.
