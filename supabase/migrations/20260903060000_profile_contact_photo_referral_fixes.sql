-- CitaFuego production fixes: WhatsApp persistence, owner photo removal and referral city priority.

-- 1) WhatsApp columns were added after the original column-level privilege hardening.
-- Keep RLS self-only and explicitly allow owners to update only the two WhatsApp fields.
grant update (whatsapp_e164, whatsapp_public) on public.user_private to authenticated;

-- 2) Owners need an auditable, owner-scoped way to remove uploaded profile photos.
create or replace function public.remove_own_profile_photo(p_photo uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user uuid := auth.uid();
  v_photo public.profile_photos%rowtype;
  v_next uuid;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;

  select * into v_photo
  from public.profile_photos
  where id=p_photo and user_id=v_user
  for update;

  if not found then raise exception 'photo_unavailable'; end if;

  if v_photo.status <> 'removed' then
    update public.profile_photos
    set status='removed', is_primary=false, updated_at=now()
    where id=p_photo and user_id=v_user;

    if v_photo.is_primary then
      select id into v_next
      from public.profile_photos
      where user_id=v_user and id<>p_photo and status='approved'
      order by position, created_at
      limit 1;
      if v_next is not null then
        update public.profile_photos set is_primary=true, updated_at=now()
        where id=v_next and user_id=v_user;
      end if;
    end if;
  end if;

  return jsonb_build_object('ok',true,'photoId',p_photo,'storagePath',v_photo.storage_path,'alreadyRemoved',v_photo.status='removed');
end;
$function$;
revoke all on function public.remove_own_profile_photo(uuid) from public,anon;
grant execute on function public.remove_own_profile_photo(uuid) to authenticated;

-- 3) Referral codes and successful-referral rewards.
-- One successfully activated friend earns seven days of city/discovery priority.
-- Multiple successful referrals stack seven-day periods instead of overwriting them.
create table if not exists public.referral_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z0-9]{10}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.referral_attributions (
  invited_user_id uuid primary key references auth.users(id) on delete cascade,
  inviter_user_id uuid not null references auth.users(id) on delete cascade,
  referral_code text not null,
  attributed_at timestamptz not null default now(),
  rewarded_at timestamptz,
  featured_until timestamptz,
  check (invited_user_id <> inviter_user_id)
);
create index if not exists referral_attributions_inviter_idx on public.referral_attributions(inviter_user_id, attributed_at desc);

alter table public.referral_codes enable row level security;
alter table public.referral_attributions enable row level security;

drop policy if exists referral_codes_self_read on public.referral_codes;
create policy referral_codes_self_read on public.referral_codes for select to authenticated using (user_id=auth.uid());
drop policy if exists referral_attributions_inviter_read on public.referral_attributions;
create policy referral_attributions_inviter_read on public.referral_attributions for select to authenticated using (inviter_user_id=auth.uid());

grant select on public.referral_codes to authenticated;
grant select on public.referral_attributions to authenticated;

create or replace function public.get_my_referral_code()
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user uuid := auth.uid();
  v_code text;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  v_code := upper(substr(encode(digest(v_user::text || ':citafuego-referral-v1','sha256'),'hex'),1,10));
  insert into public.referral_codes(user_id,code) values(v_user,v_code)
  on conflict (user_id) do nothing;
  select code into v_code from public.referral_codes where user_id=v_user;
  return v_code;
end;
$function$;
revoke all on function public.get_my_referral_code() from public,anon;
grant execute on function public.get_my_referral_code() to authenticated;

create or replace function public.claim_referral_reward(p_code text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_invited uuid := auth.uid();
  v_inviter uuid;
  v_start timestamptz;
  v_end timestamptz;
  v_inserted uuid;
begin
  if v_invited is null then raise exception 'not_authenticated'; end if;
  if not exists(select 1 from public.profiles where id=v_invited and status='active') then
    raise exception 'invited_profile_not_active';
  end if;

  select user_id into v_inviter from public.referral_codes where code=upper(trim(p_code));
  if v_inviter is null then raise exception 'invalid_referral_code'; end if;
  if v_inviter=v_invited then raise exception 'self_referral_not_allowed'; end if;

  insert into public.referral_attributions(invited_user_id,inviter_user_id,referral_code)
  values(v_invited,v_inviter,upper(trim(p_code)))
  on conflict (invited_user_id) do nothing
  returning invited_user_id into v_inserted;

  if v_inserted is null then
    select featured_until into v_end from public.referral_attributions where invited_user_id=v_invited;
    return jsonb_build_object('ok',true,'alreadyClaimed',true,'featuredUntil',v_end);
  end if;

  select greatest(now(),coalesce(max(ends_at),now())) into v_start
  from public.boost_activations
  where user_id=v_inviter and source='referral' and ends_at>now();
  v_end := v_start + interval '7 days';

  insert into public.boost_activations(user_id,started_at,ends_at,source)
  values(v_inviter,v_start,v_end,'referral');

  update public.referral_attributions
  set rewarded_at=now(), featured_until=v_end
  where invited_user_id=v_invited;

  insert into public.user_notifications(user_id,kind,title,body,href)
  values(v_inviter,'boost','Invitación confirmada','Tu perfil tendrá prioridad en tu ciudad durante 7 días.','/descubrir');

  return jsonb_build_object('ok',true,'alreadyClaimed',false,'featuredUntil',v_end);
end;
$function$;
revoke all on function public.claim_referral_reward(text) from public,anon;
grant execute on function public.claim_referral_reward(text) to authenticated;
