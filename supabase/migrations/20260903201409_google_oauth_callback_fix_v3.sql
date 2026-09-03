update public.commercialization_providers
set public_config=jsonb_build_object(
  'google_authorized_redirect_uri','https://stfbybkutnoqoxhqxyou.supabase.co/auth/v1/callback',
  'site_post_auth_callback','https://citafuego.com/auth/confirm',
  'site_origin','https://citafuego.com',
  'scopes',jsonb_build_array('openid','email','profile')
),updated_at=now()
where provider_slug='google_oauth';
