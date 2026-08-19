-- V19.1: finish the optional-trust rollout across core user features.
-- Verification/photo presence may improve trust presentation and user-selected privacy filters,
-- but they are no longer global gates for Random matching or received Likes visibility.

create or replace function public.get_who_likes_me(p_offset integer default 0,p_limit integer default 24)
returns table(profile_id uuid,display_name text,age integer,district text,verified boolean,primary_photo_path text,liked_at timestamptz)
language plpgsql
security definer
set search_path='public'
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  return query
  select p.id,p.display_name,extract(year from age(current_date,priv.birth_date))::int,p.district,p.verification_badge,photo.storage_path,i.created_at
  from public.interactions i
  join public.profiles p on p.id=i.from_user_id and p.status='active'
  join public.user_private priv on priv.user_id=p.id
  left join lateral(
    select pp.storage_path from public.profile_photos pp
    where pp.user_id=p.id and pp.status='approved'
    order by pp.is_primary desc,pp.position asc limit 1
  ) photo on true
  where i.to_user_id=auth.uid()
    and i.action in ('like','superfuego')
    and not exists(select 1 from public.interactions mine where mine.from_user_id=auth.uid() and mine.to_user_id=i.from_user_id)
    and not exists(select 1 from public.blocks b where (b.blocker_id=auth.uid() and b.blocked_id=p.id) or (b.blocker_id=p.id and b.blocked_id=auth.uid()))
  order by i.created_at desc
  offset greatest(coalesce(p_offset,0),0)
  limit least(greatest(coalesce(p_limit,24),1),50);
end;
$$;

create or replace function public.join_random_match(p_mode text)
returns jsonb
language plpgsql
security definer
set search_path='public'
as $$
declare v_user uuid:=auth.uid(); v_peer uuid; v_session uuid; v_peer_name text;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if p_mode not in ('text','voice','video') then raise exception 'invalid_mode'; end if;
  if not exists(select 1 from public.profiles where id=v_user and status='active') then raise exception 'active_profile_required'; end if;

  perform pg_advisory_xact_lock(hashtextextended('random:'||p_mode,0));
  delete from public.random_match_queue where expires_at<=now();

  select s.id into v_session from public.random_match_sessions s
  where s.status='active' and v_user in (s.user_a,s.user_b)
  order by s.started_at desc limit 1;
  if v_session is not null then
    return (select jsonb_build_object('status','matched','sessionId',s.id,'mode',s.mode) from public.random_match_sessions s where s.id=v_session);
  end if;

  select q.user_id into v_peer
  from public.random_match_queue q
  join public.profiles peer on peer.id=q.user_id and peer.status='active'
  join public.profiles me on me.id=v_user
  where q.mode=p_mode and q.user_id<>v_user and q.expires_at>now()
    and peer.city=me.city and peer.country_code=me.country_code
    and not exists(select 1 from public.blocks b where (b.blocker_id=v_user and b.blocked_id=q.user_id) or (b.blocker_id=q.user_id and b.blocked_id=v_user))
  order by q.joined_at asc limit 1 for update of q skip locked;

  if v_peer is null then
    insert into public.random_match_queue(user_id,mode,joined_at,expires_at)
    values(v_user,p_mode,now(),now()+interval '5 minutes')
    on conflict(user_id) do update set
      mode=excluded.mode,
      joined_at=case when public.random_match_queue.mode=excluded.mode then public.random_match_queue.joined_at else now() end,
      expires_at=now()+interval '5 minutes';
    return jsonb_build_object('status','waiting','mode',p_mode);
  end if;

  delete from public.random_match_queue where user_id in (v_user,v_peer);
  if v_user::text<v_peer::text then
    insert into public.random_match_sessions(mode,user_a,user_b) values(p_mode,v_user,v_peer) returning id into v_session;
  else
    insert into public.random_match_sessions(mode,user_a,user_b) values(p_mode,v_peer,v_user) returning id into v_session;
  end if;
  select display_name into v_peer_name from public.profiles where id=v_peer;
  insert into public.user_notifications(user_id,kind,title,body,href,actor_user_id)
  values(v_user,'random','Conexión aleatoria encontrada','Ya puedes iniciar la conversación.','/azar/'||v_session::text,v_peer),
        (v_peer,'random','Conexión aleatoria encontrada','Ya puedes iniciar la conversación.','/azar/'||v_session::text,v_user);
  return jsonb_build_object('status','matched','sessionId',v_session,'mode',p_mode,'peerName',v_peer_name);
end;
$$;
