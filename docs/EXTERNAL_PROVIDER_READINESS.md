# External-provider readiness gates

CitaFuego must never claim a provider-backed capability is active before the provider is actually configured, approved and verified in production.

## Required before activation

### Automated visual moderation
- Approved provider account
- Server-side API key
- Profile-photo, blog-media and Story-media test corpus
- Human-review fallback
- False-positive / false-negative acceptance thresholds

### ID + liveness verification
- Approved vendor and DPA
- Explicit user consent and retention policy
- Government-ID country coverage for Peru/LATAM
- Liveness, age and face-match production tests
- Manual appeal path

### Phone verification / anti-bot
- SMS provider and sender registration where required
- CAPTCHA/bot-risk provider
- Abuse rate limits and device-risk policy

### Premium checkout
- Approved merchant account
- Production credentials and webhook/postback verification
- Subscription lifecycle tests: purchase, renewal, cancel, refund, chargeback
- Server-side entitlement activation only after verified payment event

### Push notifications
- VAPID or approved push provider credentials
- Consent UX
- Quiet-hours / preference controls

## Release policy

If any of the above is absent, the UI must remain unavailable or clearly marked as pending configuration. No fake success state, synthetic payment, synthetic ID verification or synthetic moderation approval is permitted.
