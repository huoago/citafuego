-- Production hardening: internal relationship/privacy predicate helpers are implementation details.
-- They are invoked by SECURITY DEFINER RPCs and must not be directly callable through PostgREST.

revoke all on function public.can_read_private_album_object(text, uuid) from public, anon, authenticated;
revoke all on function public.can_view_private_album(uuid, uuid) from public, anon, authenticated;
revoke all on function public.creator_marketplace_eligible(uuid) from public, anon, authenticated;
revoke all on function public.is_active_match_pair(uuid, uuid) from public, anon, authenticated;
revoke all on function public.is_blog_friend(uuid, uuid) from public, anon, authenticated;

grant execute on function public.can_read_private_album_object(text, uuid) to service_role;
grant execute on function public.can_view_private_album(uuid, uuid) to service_role;
grant execute on function public.creator_marketplace_eligible(uuid) to service_role;
grant execute on function public.is_active_match_pair(uuid, uuid) to service_role;
grant execute on function public.is_blog_friend(uuid, uuid) to service_role;
