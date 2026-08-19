-- V20.5: new public-schema functions must opt in to Data API execution explicitly.
-- Existing function grants are unchanged by ALTER DEFAULT PRIVILEGES.

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;
