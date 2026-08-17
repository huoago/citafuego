# CitaFuego — Top-tier Product Polish

This phase focuses on trust, retention, mobile interaction quality and monetization readiness without weakening the privacy model.

## P0 — Trust and release gates

- Keep creator monetization closed until explicitly reopened.
- Add a stricter Content Security Policy and HSTS.
- Expand production smoke coverage to public product, safety and commercial gates.
- Add explicit release-contract tests for creator closure, device-only chat, dedicated screens and premium checkout gating.
- Keep all unconfigured external providers fail-closed. Never simulate ID verification, automated visual moderation, SMS verification or payment success.

## P1 — Mobile product polish

- Make Discovery feel app-native with swipe gestures, progress feedback and keyboard/touch parity while preserving real server interactions.
- Simplify mobile top-level navigation and move secondary destinations into a single More hub.
- Add a PWA manifest, installable shell and safe offline fallback for public static assets.
- Surface privacy-first product messaging around device-only chat and random P2P sessions.

## P2 — Trust upgrades that require approved external providers

These are implemented only after production credentials/vendor approvals exist:

1. Automated image/video moderation provider for profile photos, blog media and Story media.
2. Government-ID + liveness provider with explicit consent and retention policy.
3. SMS/phone verification and bot-risk provider.
4. Real premium checkout/subscription provider.
5. Production Web Push provider / VAPID keys.

Until the relevant provider is configured and verified, the product must display the capability as unavailable rather than fabricate success.
