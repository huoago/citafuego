-- V20.4: topic-vector refreshers are internal maintenance helpers.
-- They are invoked by database-owned content flows and must not be exposed as user-callable RPCs.

revoke all on function public.refresh_blog_topic_vector(uuid) from public, anon, authenticated;
revoke all on function public.refresh_story_topic_vector(uuid) from public, anon, authenticated;
