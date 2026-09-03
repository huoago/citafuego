do $$
declare
  r record;
  q text;
  c text;
begin
  for r in
    select schemaname, tablename, policyname, cmd, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (
        (coalesce(qual, '') like '%auth.uid()%' and coalesce(qual, '') not ilike '%select auth.uid()%')
        or
        (coalesce(with_check, '') like '%auth.uid()%' and coalesce(with_check, '') not ilike '%select auth.uid()%')
      )
  loop
    q := r.qual;
    c := r.with_check;

    if q is not null and q like '%auth.uid()%' and q not ilike '%select auth.uid()%' then
      q := replace(q, 'auth.uid()', '(select auth.uid())');
    end if;

    if c is not null and c like '%auth.uid()%' and c not ilike '%select auth.uid()%' then
      c := replace(c, 'auth.uid()', '(select auth.uid())');
    end if;

    if r.cmd = 'INSERT' then
      execute format(
        'alter policy %I on %I.%I with check (%s)',
        r.policyname, r.schemaname, r.tablename, c
      );
    elsif r.cmd in ('SELECT', 'DELETE') then
      execute format(
        'alter policy %I on %I.%I using (%s)',
        r.policyname, r.schemaname, r.tablename, q
      );
    else
      if q is not null and c is not null then
        execute format(
          'alter policy %I on %I.%I using (%s) with check (%s)',
          r.policyname, r.schemaname, r.tablename, q, c
        );
      elsif q is not null then
        execute format(
          'alter policy %I on %I.%I using (%s)',
          r.policyname, r.schemaname, r.tablename, q
        );
      elsif c is not null then
        execute format(
          'alter policy %I on %I.%I with check (%s)',
          r.policyname, r.schemaname, r.tablename, c
        );
      end if;
    end if;
  end loop;
end
$$;
