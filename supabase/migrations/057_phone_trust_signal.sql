-- Internal phone trust signal. The phone number itself stays in Supabase Auth and is never copied into public profile tables.
alter table public.user_private add column if not exists phone_verified_at timestamptz;
comment on column public.user_private.phone_verified_at is 'Timestamp copied from a successful Supabase Auth phone confirmation. The phone number remains private in auth.users.';
