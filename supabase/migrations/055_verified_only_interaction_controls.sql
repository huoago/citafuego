-- User-selectable verified-only contact controls. Enforcement lives in PostgreSQL so modified clients cannot bypass it.

create or replace function public.enforce_interaction_trust() returns trigger
language plpgsql security definer set search_path=public as $$
declare require_verified boolean:=false; sender_verified boolean:=false;begin
 if new.action in ('like','superfuego') then
  select coalesce(t.verified_only_likes,false) into require_verified from public.user_trust_preferences t where t.user_id=new.to_user_id;
  if require_verified then
   select coalesce(p.verification_badge,false) into sender_verified from public.profiles p where p.id=new.from_user_id;
   if not sender_verified then raise exception 'verified_sender_required'; end if;
  end if;
 end if;
 return new;
end; $$;
drop trigger if exists interactions_verified_only_guard on public.interactions;
create trigger interactions_verified_only_guard before insert or update of action,to_user_id on public.interactions for each row execute function public.enforce_interaction_trust();

create or replace function public.can_signal_conversation(p_conversation uuid) returns boolean
language plpgsql security definer stable set search_path=public as $$
declare u uuid:=auth.uid(); peer uuid; require_verified boolean:=false; sender_verified boolean:=false;begin
 if u is null then return false; end if;
 if not exists(select 1 from public.conversation_members cm join public.conversations c on c.id=cm.conversation_id where cm.conversation_id=p_conversation and cm.user_id=u and c.status='active') then return false; end if;
 select cm.user_id into peer from public.conversation_members cm where cm.conversation_id=p_conversation and cm.user_id<>u limit 1;
 if peer is null then return false; end if;
 select coalesce(t.verified_only_chat,false) into require_verified from public.user_trust_preferences t where t.user_id=peer;
 if not require_verified then return true; end if;
 select coalesce(p.verification_badge,false) into sender_verified from public.profiles p where p.id=u;
 return sender_verified;
end; $$;
revoke all on function public.can_signal_conversation(uuid) from public,anon;
grant execute on function public.can_signal_conversation(uuid) to authenticated;

drop policy if exists conversation_signals_participant_insert on public.conversation_signals;
create policy conversation_signals_participant_insert on public.conversation_signals for insert to authenticated with check (
  sender_id=auth.uid() and expires_at<=now()+interval '11 minutes' and public.can_signal_conversation(conversation_id)
);
