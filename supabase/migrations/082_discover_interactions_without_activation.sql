-- V20.2: users who completed age/legal registration may use Discover interactions
-- while their optional profile completion remains in onboarding status.
-- Restricted, suspended and banned users remain excluded.

do $$
declare
  vdef text;
begin
  select pg_get_functiondef('public.perform_interaction(uuid,public.interaction_action)'::regprocedure) into vdef;
  vdef:=replace(
    vdef,
    'if not exists(select 1 from public.profiles p where p.id=v_from and p.status=''active'') then raise exception ''profile_not_active'';end if;',
    'if not exists(select 1 from public.profiles p where p.id=v_from and p.status in (''active'',''onboarding'')) then raise exception ''profile_not_available'';end if;'
  );
  if position('p.id=v_from and p.status=''active''' in vdef)>0 or position('profile_not_active' in vdef)>0 then
    raise exception 'unable_to_open_discover_interactions';
  end if;
  execute vdef;
end $$;
