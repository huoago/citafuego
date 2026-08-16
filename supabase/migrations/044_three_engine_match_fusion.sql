-- Recommendation V3: dating + social graph + learned topic affinity fusion for potential matches.
create or replace function public.get_recommended_matches(p_limit integer default 12)
returns table(profile_id uuid,display_name text,age integer,district text,distance_bucket text,bio text,intent relationship_intent,verified boolean,primary_photo_path text,shared_interest_count integer,chemistry_score integer,recommendation_score numeric,reason text)
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid();
begin
  if u is null then raise exception 'not_authenticated'; end if;
  perform public.refresh_interest_graph_for(u);
  perform public.refresh_user_topic_affinity(u);
  return query
  with ranked as (
    select c.*,coalesce(e.score,0) social_score,
      coalesce((select sum(a.weight*.22) from public.user_topic_affinity a join public.profile_interests pi on pi.interest_id=a.topic_id where a.user_id=u and pi.user_id=c.profile_id),0) topic_score
    from public.get_discover_candidates(120) c
    left join public.interest_edges e on e.user_id=u and e.target_user_id=c.profile_id
    where coalesce(e.score,0)>-3
      and not exists(select 1 from public.recommendation_suppressions s where s.user_id=u and s.suppression_type='creator' and s.creator_id=c.profile_id)
  )
  select r.profile_id,r.display_name,r.age,r.district,r.distance_bucket,r.bio,r.intent,r.verified,r.primary_photo_path,r.shared_interest_count,r.chemistry_score,
    round((r.chemistry_score::numeric*.66+greatest(0,r.social_score)*1.05+greatest(0,r.topic_score)*.34)::numeric,3),
    case when r.topic_score>=4 and r.social_score>=4 then 'Química + red + intereses aprendidos' when r.topic_score>=4 then 'Compatibilidad con tus temas' when r.social_score>=5 then 'Afinidad social + compatibilidad' when r.shared_interest_count>0 then 'Intereses compartidos' else 'Compatibilidad para citas' end
  from ranked r
  order by (r.chemistry_score::numeric*.66+greatest(0,r.social_score)*1.05+greatest(0,r.topic_score)*.34) desc,r.verified desc
  limit least(greatest(coalesce(p_limit,12),1),30);
end; $$;
