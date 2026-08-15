# Pull Request checklist — CitaFuego V1.0

## Completed
- [x] Full production app source restored
- [x] Dependency lockfile committed
- [x] Real Supabase Auth / SSR session paths
- [x] 18+ server gate
- [x] Onboarding / private media / verification
- [x] Discovery / Match / Chat / Realtime
- [x] Who Likes You / Rewind / Premium Filters / SuperFuego entitlement
- [x] Report / Block / Trust & Safety admin
- [x] AI moderation adapter architecture
- [x] Legal and safety pages
- [x] CI / guarded deploy / daily health workflows
- [x] Additive production migrations 021–023 applied
- [x] `anon` privileged SECURITY DEFINER execute count verified at 0
- [x] 31 unit/security tests passing
- [x] Next.js production build passing

## Not production-live
- [ ] Production SMTP configured and tested
- [ ] Controlled Trust & Safety Auth user created/assigned
- [ ] Two-account production E2E completed
- [ ] Intended Vercel production project visible and READY
- [ ] `citafuego.com` DNS connected and propagated
- [ ] HTTPS + custom-domain `/api/health` verified

## Merge rule
Merge to `main` only when the exact PR head has green CI and no unresolved high-risk review finding. Merging this PR means **Release Candidate READY**; it does not by itself mean production is live.
