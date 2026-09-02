create or replace function public.admin_get_platform_controls_v2()
returns jsonb language plpgsql stable security definer set search_path='public','auth','pg_temp' as $$
declare qualified integer:=0; threshold integer:=100;
begin
  if not public.admin_has_any_role(array['super_admin','finance','analyst','growth']) then raise exception 'forbidden' using errcode='42501'; end if;
  select coalesce((value #>> '{}')::int,100) into threshold from public.admin_operation_settings where key='commercialization_threshold';
  select count(distinct p.id)::int into qualified from public.profiles p
  join auth.users u on u.id=p.id join public.user_private priv on priv.user_id=p.id
  where p.country_code='PE' and lower(p.city)='lima' and p.profile_completion>=80 and p.status='active'
    and u.email_confirmed_at is not null and priv.birth_date<=current_date-interval '18 years'
    and exists(select 1 from public.profile_photos ph where ph.user_id=p.id and ph.status='approved');
  return jsonb_build_object(
    'qualifiedRealUsers',qualified,'threshold',threshold,'remaining',greatest(threshold-qualified,0),'gateOpen',qualified>=threshold,
    'flags',coalesce((select jsonb_object_agg(f.key,jsonb_build_object('enabled',f.enabled,'config',f.config,'updatedAt',f.updated_at)) from public.feature_flags f),'{}'::jsonb),
    'payments',jsonb_build_object('total',(select count(*) from public.purchases),'paid',(select count(*) from public.purchases where status='paid'),'failed24h',(select count(*) from public.purchases where status='failed' and created_at>=now()-interval '24 hours'),'revenueMinor',(select coalesce(sum(amount_minor),0) from public.purchases where status='paid'))
  );
end;$$;
revoke all on function public.admin_get_platform_controls_v2() from public,anon;
grant execute on function public.admin_get_platform_controls_v2() to authenticated;