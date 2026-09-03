create or replace function public.log_auto_moderation_event()
returns trigger language plpgsql security definer set search_path='public','pg_temp' as $$
declare changed boolean:=false;
begin
  if new.auto_moderation_status='review' then
    if tg_op='INSERT' then changed:=true;
    elsif tg_op='UPDATE' then changed:=old.body is distinct from new.body or old.auto_moderation_status is distinct from new.auto_moderation_status;
    end if;
    if changed then
      insert into public.moderation_events(user_id,surface,object_type,object_id,provider,model_version,policy_version,labels,action,reasons,human_review)
      values(new.author_id,case when tg_table_name='blog_posts' then 'blog' else 'story' end,case when tg_table_name='blog_posts' then 'blog_post' else 'story' end,new.id::text,'cita_content_rules','rules-v3','2026-09-content-v3',jsonb_build_object('labels',new.auto_moderation_labels,'score',new.auto_moderation_score),'hold',new.auto_moderation_labels,true);
    end if;
  end if;
  return new;
end;$$;
