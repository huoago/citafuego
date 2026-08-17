-- Post-review hardening for top-tier trust, private media and Date Safety.
-- Forward-only migration: do not rewrite previously applied migrations.

-- 1) Private album moderation can no longer be finalized directly by an authenticated client.
-- The application completion route validates ownership, sanitizes/moderates media, and performs the final write with the server service role.
revoke execute on function public.finalize_private_album_upload(uuid,text,text,integer,integer) from authenticated;

-- 2) Match viewers may not request storage objects directly. Their only path is the atomic
-- consume_private_album_item RPC followed by a 60-second signed URL issued server-side.
drop policy if exists private_albums_select_authorized on storage.objects;
create policy private_albums_select_owner_only on storage.objects
for select to authenticated
using (bucket_id='private-albums' and split_part(name,'/',1)=auth.uid()::text);

-- 3) Date proposal transitions are terminal once a proposal leaves proposed state.
create or replace function public.respond_date_proposal(p_proposal uuid,p_response text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid();d public.date_proposals%rowtype;m public.matches%rowtype;
begin
  if u is null then raise exception 'not_authenticated'; end if;
  if p_response not in('accepted','declined','cancelled') then raise exception 'invalid_response'; end if;
  select * into d from public.date_proposals where id=p_proposal for update;
  if not found then raise exception 'proposal_unavailable'; end if;
  if d.status <> 'proposed' then raise exception 'proposal_finalized'; end if;
  select * into m from public.matches where id=d.match_id and status='active' and (u=user_a or u=user_b);
  if not found then raise exception 'active_match_required'; end if;
  if p_response='cancelled' and d.proposed_by<>u then raise exception 'forbidden'; end if;
  if p_response in('accepted','declined') and d.proposed_by=u then raise exception 'forbidden'; end if;
  update public.date_proposals set status=p_response,updated_at=now() where id=p_proposal;
  return jsonb_build_object('ok',true,'status',p_response);
end;$$;
revoke all on function public.respond_date_proposal(uuid,text) from public,anon;
grant execute on function public.respond_date_proposal(uuid,text) to authenticated;

-- 4) A store purchase may be compensated at most once even when the processor emits
-- multiple reversal event kinds (void/refund/chargeback) for the same purchase.
create or replace function public.prevent_duplicate_store_reversal() returns trigger
language plpgsql set search_path=public as $$
begin
  if new.source_type in ('refunded','chargeback') and new.source_id is not null
     and exists(
       select 1 from public.entitlement_ledger e
       where e.source_id=new.source_id
         and e.entitlement=new.entitlement
         and e.source_type in ('refunded','chargeback')
     ) then
    return null;
  end if;
  return new;
end;$$;

drop trigger if exists entitlement_store_reversal_once on public.entitlement_ledger;
create trigger entitlement_store_reversal_once
before insert on public.entitlement_ledger
for each row execute function public.prevent_duplicate_store_reversal();

revoke all on function public.prevent_duplicate_store_reversal() from public,anon,authenticated;
