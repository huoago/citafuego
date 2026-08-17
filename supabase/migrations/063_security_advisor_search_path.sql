-- Resolve Supabase Security Advisor mutable search_path warnings without changing behavior.

create or replace function public.can_view_social_profile(p_author uuid,p_viewer uuid)
returns boolean
language sql
stable security definer
set search_path=public
as $$
 select p_author=p_viewer or(
  not public.is_blocked_pair(p_author,p_viewer) and exists(
   select 1 from public.profiles p where p.id=p_author and p.status='active'
  )
 )
$$;

create or replace function public.get_active_date_proposal(p_match uuid)
returns table(id uuid,match_id uuid,proposed_by uuid,activity_type text,area_label text,proposed_at timestamptz,status text)
language sql
stable security definer
set search_path=public
as $$
select d.id,d.match_id,d.proposed_by,d.activity_type,d.area_label,d.proposed_at,d.status
from public.date_proposals d join public.matches m on m.id=d.match_id
where d.match_id=p_match and d.status in('proposed','accepted') and(auth.uid()=m.user_a or auth.uid()=m.user_b)
order by d.updated_at desc limit 1
$$;
