-- Keep automated media moderation status aligned with recommendation eligibility.
-- Human review V2 writes reviewed_at + recommendation_status explicitly, so limited-distribution
-- decisions are preserved and never overwritten by this trigger.

create or replace function public.sync_media_recommendation_status()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if new.reviewed_at is null then
    if new.status::text='approved' and coalesce(new.recommendation_status,'pending')='pending' then
      new.recommendation_status:='eligible';
    elsif new.status::text='rejected' then
      new.recommendation_status:='blocked';
    end if;
  end if;
  return new;
end; $$;

revoke all on function public.sync_media_recommendation_status() from public,anon,authenticated;

drop trigger if exists profile_photos_recommendation_status_sync on public.profile_photos;
create trigger profile_photos_recommendation_status_sync
before insert or update of status on public.profile_photos
for each row execute function public.sync_media_recommendation_status();

drop trigger if exists blog_post_media_recommendation_status_sync on public.blog_post_media;
create trigger blog_post_media_recommendation_status_sync
before insert or update of status on public.blog_post_media
for each row execute function public.sync_media_recommendation_status();

drop trigger if exists story_media_recommendation_status_sync on public.story_media;
create trigger story_media_recommendation_status_sync
before insert or update of status on public.story_media
for each row execute function public.sync_media_recommendation_status();
