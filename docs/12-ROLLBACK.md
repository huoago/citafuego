# Rollback Procedure

## Application rollback

Prefer an immutable deployment rollback to the last known-good production commit/deployment. Do not rewrite `main` history.

1. Identify last green CI commit and last READY production deployment.
2. Promote/redeploy that exact artifact or commit.
3. Validate `/api/health`, login callback and protected-route behavior.
4. Keep the failed release commit and logs for investigation.

## Database rollback

Applied historical migrations `001`–`014` must never be edited or deleted.

For `018+`, prefer a new compensating migration rather than destructive rollback. Any compensating migration must:
- be additive/reversible where practical
- preserve user data
- restore prior function signatures/permissions intentionally
- explicitly re-run the anonymous SECURITY DEFINER check

Never reset the production Supabase database to roll back an application release.

## Emergency feature rollback

Use `feature_flags` to disable a defective non-core capability where possible. Authentication, age protection, block/report, RLS and Trust & Safety must not be bypassed to keep a feature online.
