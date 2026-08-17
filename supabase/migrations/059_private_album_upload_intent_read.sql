-- Allow album owners to inspect only their own short-lived upload intents during finalize processing.
drop policy if exists private_album_upload_intents_self_read on public.private_album_upload_intents;
create policy private_album_upload_intents_self_read on public.private_album_upload_intents for select to authenticated using(user_id=auth.uid());
grant select on public.private_album_upload_intents to authenticated;
