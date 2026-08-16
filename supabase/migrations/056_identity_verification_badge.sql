-- Optional document + selfie identity verification. Public profiles expose only a boolean badge; document data stays with the verification provider.
alter table public.profiles add column if not exists identity_verification_badge boolean not null default false;
create unique index if not exists verification_sessions_provider_session_uidx on public.verification_sessions(provider,provider_session_id) where provider_session_id is not null;

create or replace function public.get_public_trust_badges(p_profiles uuid[])
returns table(profile_id uuid,photo_verified boolean,identity_verified boolean)
language plpgsql security definer stable set search_path=public as $$
declare u uuid:=auth.uid();begin
 if u is null then raise exception 'not_authenticated';end if;
 return query select p.id,p.verification_badge,p.identity_verification_badge from public.profiles p
 where p.id=any(coalesce(p_profiles,array[]::uuid[])) and p.status='active'
 and not exists(select 1 from public.blocks b where (b.blocker_id=u and b.blocked_id=p.id) or (b.blocker_id=p.id and b.blocked_id=u));
end;$$;
revoke all on function public.get_public_trust_badges(uuid[]) from public,anon;
grant execute on function public.get_public_trust_badges(uuid[]) to authenticated;

comment on column public.profiles.identity_verification_badge is 'True only after a trusted external ID verification decision or equivalent administrator-approved identity check. Never stores document details.';
