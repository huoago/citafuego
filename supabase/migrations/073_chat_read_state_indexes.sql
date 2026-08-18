create index if not exists conversation_reads_user_idx on public.conversation_reads(user_id);
create index if not exists conversation_reads_last_message_idx on public.conversation_reads(last_read_message_id) where last_read_message_id is not null;
