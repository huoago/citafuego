-- Membership is temporarily hidden; do not leave a visible Likes entry behind a Gold paywall.
create or replace function public.get_who_likes_me(p_offset integer default 0,p_limit integer default 24)
returns table(profile_id uuid,display_name text,age integer,district text,verified boolean,primary_photo_path text,liked_at timestamptz)
language plpgsql
security definer
set search_path to 'public'
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
    and photo.storage_path is not null
    and not exists(select 1 from public.interactions mine where mine.from_user_id=auth.uid() and mine.to_user_id=i.from_user_id)
    and not exists(select 1 from public.blocks b where (b.blocker_id=auth.uid() and b.blocked_id=p.id) or (b.blocker_id=p.id and b.blocked_id=auth.uid()))
  order by i.created_at desc
  offset greatest(coalesce(p_offset,0),0)
  limit least(greatest(coalesce(p_limit,24),1),50);
end;
$$;
revoke all on function public.get_who_likes_me(integer,integer) from public,anon;
grant execute on function public.get_who_likes_me(integer,integer) to authenticated;
