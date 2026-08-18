-- V13: optional WhatsApp contact with database-enforced privacy.
-- The number lives in user_private and is never directly readable by other users.
-- get_social_profile_bundle only emits it when the owner explicitly marks it public.

alter table public.user_private
  add column if not exists whatsapp_e164 text,
  add column if not exists whatsapp_public boolean not null default false;

alter table public.user_private
  drop constraint if exists user_private_whatsapp_e164_check;

alter table public.user_private
  add constraint user_private_whatsapp_e164_check
  check (whatsapp_e164 is null or whatsapp_e164 ~ '^\+[1-9][0-9]{7,14}$');

comment on column public.user_private.whatsapp_e164 is
  'Optional WhatsApp number in E.164 format. Private by default and protected by user_private RLS.';
comment on column public.user_private.whatsapp_public is
  'Owner-controlled flag. When false the WhatsApp number is omitted from public social profile reads.';

create or replace function public.get_social_profile_bundle(p_target uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare
  u uuid := auth.uid();
  result jsonb;
begin
  if u is null or not public.can_view_social_profile(p_target,u) then
    raise exception 'profile_unavailable';
  end if;

  select jsonb_build_object(
    'profile',jsonb_build_object(
      'id',p.id,
      'displayName',p.display_name,
      'bio',p.bio,
      'genderIdentity',p.gender_identity,
      'city',p.city,
      'district',p.district,
      'countryCode',p.country_code,
      'languages',p.languages,
      'intent',p.intent,
      'occupation',p.occupation,
      'heightCm',p.height_cm,
      'verified',p.verification_badge,
      'lastActiveAt',p.last_active_at
    ),
    'handle',h.handle,
    'followers',(select count(*) from public.social_follows f where f.followed_id=p_target),
    'following',(select count(*) from public.social_follows f where f.follower_id=p_target),
    'viewerFollows',exists(select 1 from public.social_follows f where f.follower_id=u and f.followed_id=p_target),
    'followsViewer',exists(select 1 from public.social_follows f where f.follower_id=p_target and f.followed_id=u),
    'isMatch',public.is_blog_friend(p_target,u),
    'whatsapp',case
      when coalesce(up.whatsapp_public,false) and up.whatsapp_e164 is not null then up.whatsapp_e164
      else null
    end,
    'prompts',coalesce((
      select jsonb_agg(jsonb_build_object('slot',pp.slot,'promptKey',pp.prompt_key,'answer',pp.answer) order by pp.slot)
      from public.profile_prompts pp where pp.user_id=p_target
    ),'[]'::jsonb),
    'photos',coalesce((
      select jsonb_agg(jsonb_build_object('id',ph.id,'path',ph.storage_path,'position',ph.position,'primary',ph.is_primary) order by ph.is_primary desc,ph.position)
      from public.profile_photos ph where ph.user_id=p_target and ph.status='approved'
    ),'[]'::jsonb),
    'activeStories',(select count(*) from public.stories s where s.author_id=p_target and s.status='active' and s.expires_at>now() and public.can_view_story(s.id,u))
  ) into result
  from public.profiles p
  left join public.social_handles h on h.user_id=p.id
  left join public.user_private up on up.user_id=p.id
  where p.id=p_target;

  return result;
end;
$function$;
