-- Admin RPC execution contract v6
-- Document the deliberate security boundary for Data API admin functions.
--
-- Supabase's generic linter warns whenever an authenticated role can EXECUTE a
-- SECURITY DEFINER function. CitaFuego admin RPCs intentionally use this shape
-- because the Data API cannot grant EXECUTE to per-user database roles.
-- The real authorization boundary is therefore:
--   authenticated EXECUTE + mandatory in-function admin role check + RLS/fail-closed tables.
--
-- This migration fails closed if a future admin/review SECURITY DEFINER RPC is
-- exposed to authenticated users without one of the approved authorization
-- guards. It does not weaken or bypass any existing permission.

do $$
declare
  r record;
  fn text;
begin
  for r in
    select p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.prosecdef
      and has_function_privilege('authenticated',p.oid,'EXECUTE')
      and (p.proname like 'admin_%' or p.proname like 'review_%')
  loop
    fn:=pg_get_functiondef(r.oid);
    if position('admin_has_any_role' in fn)=0
       and position('is_trust_admin' in fn)=0 then
      raise exception 'Unsafe authenticated SECURITY DEFINER RPC: %(%)',r.proname,r.args;
    end if;
  end loop;
end $$;

comment on function public.admin_has_any_role(text[]) is
'Authorization guard for Data API admin RPCs. Authenticated users may call selected SECURITY DEFINER wrappers, but each privileged wrapper must fail closed through this guard (or is_trust_admin for trust/safety review RPCs).';
