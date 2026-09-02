-- CitaFuego verification policy: no DNI/passport/document KYC.
-- The only person-real verification is a private selfie reviewed by Trust & Safety.

-- Legacy document-identity badge stays as a compatibility column for this release,
-- but it can no longer represent a public trust signal.
update public.profiles
set identity_verification_badge=false
where identity_verification_badge=true;

comment on column public.profiles.identity_verification_badge is
'DEPRECATED. Document/DNI/passport identity verification is disabled. Always false; use verification_badge for private-selfie photo verification.';

-- Close any legacy hosted KYC sessions that were still waiting for a provider.
update public.verification_sessions
set status='expired',
    reason_code='document_identity_verification_disabled',
    completed_at=coalesce(completed_at,now())
where provider='veriff' and status='pending';

-- Keep the historical RPC shape so older clients do not break, while ensuring
-- identity_verified can never be exposed as a public badge.
create or replace function public.get_public_trust_badges(p_profiles uuid[])
returns table(profile_id uuid,photo_verified boolean,identity_verified boolean)
language plpgsql security definer stable set search_path=public as $$
declare u uuid:=auth.uid();begin
 if u is null then raise exception 'not_authenticated';end if;
 return query
 select p.id,p.verification_badge,false
 from public.profiles p
 where p.id=any(coalesce(p_profiles,array[]::uuid[]))
   and p.status='active'
   and not exists(
     select 1 from public.blocks b
     where (b.blocker_id=u and b.blocked_id=p.id)
        or (b.blocker_id=p.id and b.blocked_id=u)
   );
end;$$;
revoke all on function public.get_public_trust_badges(uuid[]) from public,anon;
grant execute on function public.get_public_trust_badges(uuid[]) to authenticated;

-- Selfies are evidence, not social media. Owners may upload them, but cannot
-- read/render them back through Storage. Only Trust & Safety can view evidence.
drop policy if exists verification_selfie_private_select on storage.objects;
