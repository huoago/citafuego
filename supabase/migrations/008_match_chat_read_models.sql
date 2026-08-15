-- Safe Match/Chat read models and held-message isolation.
drop policy if exists messages_members_read on public.messages;
create policy messages_members_read on public.messages for select to authenticated using (
  exists(select 1 from public.conversation_members cm where cm.conversation_id=messages.conversation_id and cm.user_id=auth.uid())
  and (messages.status='sent' or messages.sender_id=auth.uid())
);

create or replace function public.get_my_matches(p_limit integer default 50)
returns table(match_id uuid,conversation_id uuid,other_profile_id uuid,display_name text,district text,verified boolean,primary_photo_path text,matched_at timestamptz,last_message_at timestamptz,last_message_preview text)
language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); begin
if v_user is null then raise exception 'not_authenticated'; end if;
return query select m.id,c.id,p.id,p.display_name,p.district,p.verification_badge,photo.storage_path,m.matched_at,c.last_message_at,lastmsg.preview
from public.matches m join public.conversations c on c.match_id=m.id and c.status='active'
join public.profiles p on p.id=case when m.user_a=v_user then m.user_b else m.user_a end and p.status='active'
left join lateral(select pp.storage_path from public.profile_photos pp where pp.user_id=p.id and pp.status='approved' order by pp.is_primary desc,pp.position asc limit 1) photo on true
left join lateral(select left(msg.body,120) preview from public.messages msg where msg.conversation_id=c.id and msg.status='sent' and msg.deleted_at is null order by msg.created_at desc limit 1) lastmsg on true
where m.status='active' and (m.user_a=v_user or m.user_b=v_user) and not exists(select 1 from public.blocks b where (b.blocker_id=v_user and b.blocked_id=p.id) or (b.blocker_id=p.id and b.blocked_id=v_user))
order by coalesce(c.last_message_at,m.matched_at) desc limit least(greatest(coalesce(p_limit,50),1),100);
end; $$;
revoke all on function public.get_my_matches(integer) from public; grant execute on function public.get_my_matches(integer) to authenticated;

create or replace function public.get_conversation_header(p_conversation uuid)
returns table(conversation_id uuid,match_id uuid,other_profile_id uuid,display_name text,district text,verified boolean,primary_photo_path text)
language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); begin
if v_user is null then raise exception 'not_authenticated'; end if;
return query select c.id,m.id,p.id,p.display_name,p.district,p.verification_badge,photo.storage_path from public.conversations c join public.matches m on m.id=c.match_id and m.status='active' join public.profiles p on p.id=case when m.user_a=v_user then m.user_b else m.user_a end and p.status='active'
left join lateral(select pp.storage_path from public.profile_photos pp where pp.user_id=p.id and pp.status='approved' order by pp.is_primary desc,pp.position asc limit 1) photo on true
where c.id=p_conversation and c.status='active' and (m.user_a=v_user or m.user_b=v_user) and not exists(select 1 from public.blocks b where (b.blocker_id=v_user and b.blocked_id=p.id) or (b.blocker_id=p.id and b.blocked_id=v_user)) limit 1;
end; $$;
revoke all on function public.get_conversation_header(uuid) from public; grant execute on function public.get_conversation_header(uuid) to authenticated;

create or replace function public.can_send_message(p_conversation uuid)
returns boolean language sql stable security definer set search_path=public as $$
select exists(select 1 from public.conversations c join public.matches m on m.id=c.match_id join public.profiles me on me.id=auth.uid() where c.id=p_conversation and c.status='active' and m.status='active' and me.status='active' and (m.user_a=auth.uid() or m.user_b=auth.uid()) and not exists(select 1 from public.blocks b where (b.blocker_id=m.user_a and b.blocked_id=m.user_b) or (b.blocker_id=m.user_b and b.blocked_id=m.user_a)));
$$;
revoke all on function public.can_send_message(uuid) from public; grant execute on function public.can_send_message(uuid) to authenticated;
