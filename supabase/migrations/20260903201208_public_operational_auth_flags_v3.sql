create or replace function public.public_feature_enabled(p_key text)
returns boolean language sql stable security definer set search_path='public','pg_temp' as $$
  select case when p_key=any(array['ACCOUNT_LOGIN_ENABLED','EMAIL_LOGIN_ENABLED','EMAIL_REGISTRATION_ENABLED','GOOGLE_LOGIN_ENABLED','BLOG_MEDIA_ENABLED','STORY_MEDIA_ENABLED'])
    then coalesce((select enabled from public.feature_flags where key=p_key),false)
    else false end;
$$;
revoke all on function public.public_feature_enabled(text) from public;
grant execute on function public.public_feature_enabled(text) to anon,authenticated;
