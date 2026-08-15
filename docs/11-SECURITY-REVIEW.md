# CitaFuego Security Review

## Non-negotiable invariants

- 18+ server-side enforcement.
- Birth date, legal name, phone, exact latitude/longitude stay private.
- profile and verification media buckets remain private.
- approved/signed media only is exposed to Discovery.
- browser cannot set `verification_badge` or verification decision.
- browser does not receive service-role/secret keys.
- all Premium authorization is checked server/database side.
- held moderation messages are not visible to recipient.
- block silently removes interaction/chat eligibility.
- admin evidence access is scoped; no default unrestricted chat browsing.
- anonymous execution of privileged `SECURITY DEFINER` RPCs must remain zero.

## Threat review

### Auth bypass / IDOR
Protected application routes use SSR claims. Database RPCs bind the acting user to `auth.uid()`. Conversation/read models validate membership.

### CSRF / open redirect
Unsafe requests enforce same-origin at the Next.js proxy layer. Auth confirmation accepts only internal known navigation targets rather than an arbitrary external destination.

### XSS
Profile/user text is rendered through React escaping; no user-controlled `dangerouslySetInnerHTML` is used in primary flows.

### SQL injection
Application writes use Supabase typed query/RPC APIs; SQL string construction with user-provided input is not used.

### File upload abuse / MIME spoof / EXIF leak
Photo ingestion validates declared MIME against the actual decoded image format, applies pixel/dimension limits, auto-orients, resizes and re-encodes to WebP. Metadata is not preserved. Raw uploads are removed after sanitization/finalization.

### Location leak
Discovery returns distance buckets, never exact coordinates. Exact location remains in private storage/table paths.

### Admin privilege escalation
Admin APIs and read models require explicit admin roles and audited operations. Trust & Safety access is separated from normal user capabilities.

### Rate limiting
Message send rate limiting is enforced in the trusted PostgreSQL RPC, not only in the browser/API handler.

## Release queries

Always validate after new migrations:

```sql
select count(*) filter (
  where has_function_privilege('anon', p.oid, 'EXECUTE')
) as anon_security_definer_executable
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prosecdef=true;
```

Expected result: `0`.
