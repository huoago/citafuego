alter table public.admin_user_roles
  add constraint admin_user_roles_temporary_scope_requires_expiry_check
  check (grant_scope not in ('qa','temporary_ops') or expires_at is not null);

alter table public.admin_user_roles
  add constraint admin_user_roles_no_permanent_test_reason_check
  check (
    expires_at is not null
    or coalesce(grant_reason,'') !~* '(^|[^[:alnum:]_])(qa|test|testing|validation|prueba|pruebas|validaci[oó]n)([^[:alnum:]_]|$)'
  );
