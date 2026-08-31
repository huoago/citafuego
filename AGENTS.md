# CitaFuego operating rules

- CitaFuego is an 18+ dating and social-discovery product for Lima Metropolitana. It is not an escort directory, adult-services marketplace, pornography catalogue, paid-companionship service, or creator-paywall product.
- Never invent profiles, likes, matches, messages, online status, reviews, verification, availability, or growth metrics.
- Keep exact coordinates private. Public product surfaces may expose only district and coarse distance buckets.
- Trust comes before growth: age gate, consent, moderation, block/report, privacy and auditable admin actions are part of the core flow.
- Before 100 qualified real users, `ADS_ENABLED`, `MEMBERSHIP_ENABLED`, `PAYMENTS_ENABLED`, and `PAID_BOOST_ENABLED` stay false. Reaching the target never turns monetization on automatically; a super administrator must explicitly approve it.
- A qualified user is 18+, has confirmed email, is in Lima/PE, has an active profile at least 80% complete, and has an approved photo.
- One qualified referral grants exactly one Boost day, recorded in an append-only wallet ledger.
- New cities, material privacy changes, real payments, new recurring spend, major DNS changes, irreversible production database changes, large deletions and mass sanctions require owner approval.
- All database tables exposed through Supabase must use RLS. Service-role keys stay server-only. Privileged changes require RBAC and an audit entry.
- Every production change must pass lint, typecheck, tests, build and browser smoke verification. Do not bypass a failing release gate.
