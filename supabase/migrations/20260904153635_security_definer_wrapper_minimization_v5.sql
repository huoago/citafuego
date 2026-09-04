-- Security definer wrapper minimization v5
-- The two-argument blog comment helper is only a compatibility wrapper around
-- the guarded three-argument RPC. It does not need elevated execution context.
alter function public.add_blog_comment(uuid,text) security invoker;
