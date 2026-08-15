# Production SMTP and Auth Email

Supabase's built-in SMTP is for development/testing and must not be treated as the CitaFuego production mail service.

## Supported providers

Any reliable SMTP provider may be used, including:
- Resend
- AWS SES
- Postmark
- SendGrid
- Brevo

Recommended sender separation:

- Auth: `no-reply@auth.citafuego.com`
- Marketing, if introduced later: separate subdomain and sender reputation.

## Required DNS/email controls

Configure SPF, DKIM, and DMARC for the sending domain before public launch.

## Supabase Auth URL settings

Production Site URL:

`https://citafuego.com`

Allowed redirect:

`https://citafuego.com/auth/confirm`

The application consumes a token hash at `/auth/confirm` and establishes the SSR cookie session before redirecting to `/discover` or `/onboarding`.

## Email template guidance

Keep Auth email transactional and concise. Do not mix sexualized marketing content into authentication mail.

Magic Link / confirmation CTA must resolve through CitaFuego's approved redirect path. Test on Gmail, Outlook and at least one common Latin-American mailbox before public launch.

## Launch acceptance

Production is not LIVE until a non-team test mailbox can successfully receive the authentication email, open it, establish a session on `citafuego.com`, and complete the expected redirect.
