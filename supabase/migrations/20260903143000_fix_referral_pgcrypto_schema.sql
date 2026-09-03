-- Resolve pgcrypto from its actual Supabase extension schema while keeping the function's search_path explicit.
alter function public.get_my_referral_code() set search_path = 'public', 'extensions';
