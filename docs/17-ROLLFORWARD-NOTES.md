# CitaFuego V1.0 roll-forward notes

Applied production migrations in this RC:

- `021_admin_backoffice`
- `022_realtime_and_rate_limits`
- `023_superfuego_entitlements`

These migrations have already been applied to production Supabase and must now be treated as immutable history just like migrations through `020`. Any follow-up database fix must start at `024` or later.

If the application is rolled back before production launch, do not roll back the database by editing or deleting these migration files. Keep the database forward-compatible and disable unused features in application code/feature flags as needed.
