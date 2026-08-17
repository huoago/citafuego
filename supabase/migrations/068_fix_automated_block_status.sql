-- Match status is an enum: active | unmatched | blocked.
-- Conversation status is constrained to: active | closed | restricted.
create or replace function public.block_user(p_user uuid,p_reason text default 'user_block')
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user uuid:=auth.uid();
  v_is_new boolean:=false;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if p_user is null or p_user=v_user then raise exception 'invalid_target'; end if;

  if not exists(select 1 from public.blocks where blocker_id=v_user and blocked_id=p_user) then
    v_is_new:=true;
    insert into public.blocks(blocker_id,blocked_id,reason) values(v_user,p_user,nullif(p_reason,''));
    insert into public.risk_signals(user_id,signal_type,weight,source,expires_at,metadata)
    values(p_user,'user_block',1,'user_block',now()+interval '30 days',jsonb_build_object('blocker_id',v_user));
  else
    update public.blocks set reason=coalesce(nullif(p_reason,''),reason) where blocker_id=v_user and blocked_id=p_user;
  end if;

  update public.matches set status='blocked',ended_at=coalesce(ended_at,now())
  where status='active' and ((user_a=v_user and user_b=p_user) or (user_a=p_user and user_b=v_user));

  update public.conversations c set status='closed'
  where c.status='active' and exists(
    select 1 from public.matches m where m.id=c.match_id
      and ((m.user_a=v_user and m.user_b=p_user) or (m.user_a=p_user and m.user_b=v_user))
  );

  perform public.auto_review_user_safety(p_user);
  return jsonb_build_object('blocked',true,'new_signal',v_is_new);
end;
$$;

revoke all on function public.block_user(uuid,text) from public,anon;
grant execute on function public.block_user(uuid,text) to authenticated;
