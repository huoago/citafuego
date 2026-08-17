-- Durable matched-user chat restored after the earlier device-only experiment.
-- Keep the trusted messaging RPC available to authenticated users only.
grant execute on function public.submit_message(uuid,text,text,text,jsonb) to authenticated;

-- Internal trigger/maintenance SECURITY DEFINER functions are not client APIs.
revoke execute on function public.enforce_interaction_trust() from public;
revoke execute on function public.refresh_blog_topic_vector(uuid) from public;
revoke execute on function public.refresh_story_topic_vector(uuid) from public;
revoke execute on function public.sync_content_topic_vector() from public;

create or replace function public.get_my_matches(p_limit integer default 50)
returns table(
  match_id uuid,
  conversation_id uuid,
  other_profile_id uuid,
  display_name text,
  district text,
  verified boolean,
  primary_photo_path text,
  matched_at timestamptz,
  last_message_at timestamptz,
  last_message_preview text
)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not_authenticated'; end if;

  return query
  select
    m.id,
    c.id,
    p.id,
    p.display_name,
    p.district,
    p.verification_badge,
    photo.storage_path,
    m.matched_at,
    latest.created_at,
    latest.preview
  from public.matches m
  join public.conversations c on c.match_id=m.id and c.status='active'
  join public.profiles p
    on p.id=case when m.user_a=v_user then m.user_b else m.user_a end
   and p.status='active'
  left join lateral(
    select pp.storage_path
    from public.profile_photos pp
    where pp.user_id=p.id and pp.status='approved'
    order by pp.is_primary desc,pp.position asc
    limit 1
  ) photo on true
  left join lateral(
    select
      msg.created_at,
      case
        when msg.body is null or btrim(msg.body)='' then 'Mensaje'
        when length(msg.body)>120 then left(msg.body,117)||'…'
        else msg.body
      end::text as preview
    from public.messages msg
    where msg.conversation_id=c.id
      and msg.deleted_at is null
      and msg.status='sent'
    order by msg.created_at desc
    limit 1
  ) latest on true
  where m.status='active'
    and (m.user_a=v_user or m.user_b=v_user)
    and not exists(
      select 1
      from public.blocks b
      where (b.blocker_id=v_user and b.blocked_id=p.id)
         or (b.blocker_id=p.id and b.blocked_id=v_user)
    )
  order by coalesce(latest.created_at,m.matched_at) desc
  limit least(greatest(coalesce(p_limit,50),1),100);
end;
$$;

grant execute on function public.get_my_matches(integer) to authenticated;
