# Production deployment blockers

CitaFuego V1.0 application code and database are Release Candidate READY, but production must not be described as live until all blockers below are resolved and verified.

## 1. Production SMTP

Supabase Auth must use a production SMTP provider. The built-in test mail service is not accepted for launch. Supported operating choices include Resend, AWS SES, Postmark, SendGrid or Brevo. Auth confirmation must return to `https://citafuego.com/auth/confirm`.

## 2. Controlled production users

The production Supabase project currently has no Auth users. Create two controlled 18+ test accounts only after production SMTP is working. Use those accounts to run the complete activation/match/chat/report/block E2E.

## 3. Trust & Safety administrator

Assign `super_admin` or `trust_safety` only to a controlled authenticated production user after the account exists. Never create an orphan admin role or guess an operator email.

## 4. Vercel project visibility / production secrets

The currently connected Vercel team does not expose the previously completed CitaFuego project. Production READY therefore cannot be verified through the current connection. The guarded GitHub production workflow expects these secret-store values:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

A successful application build is not a successful Vercel production deployment.

## 5. Alibaba Cloud DNS

Authoritative DNS write access for `citafuego.com` is not connected in the current environment. Do not guess or overwrite DNS records. After the intended hosting project is READY, attach the custom domain, apply the hosting provider's verified DNS records, wait for propagation and validate HTTPS.

## Final live gate

Only declare `citafuego.com` live when:

- production deployment = READY
- custom domain attached
- DNS propagated
- HTTPS valid
- `/api/health` = 200 on custom domain
- production Magic Link email works
- controlled two-account E2E passes on production
