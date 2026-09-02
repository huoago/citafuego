-- Allow the private account login identifier to be either the original
-- 4-24 character username format or an email-shaped identifier.
-- This does not publish the identifier and does not mark the email as a
-- verified recovery/contact address; that remains a separate opt-in flow.

alter table public.account_usernames
  drop constraint if exists account_username_format;

alter table public.account_usernames
  add constraint account_username_format
  check (
    (username ~ '^[A-Za-z0-9][A-Za-z0-9._-]{3,23}$')
    or (
      char_length(username) <= 254
      and username ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      and lower(username) not like '%@accounts.citafuego.invalid'
    )
  );
