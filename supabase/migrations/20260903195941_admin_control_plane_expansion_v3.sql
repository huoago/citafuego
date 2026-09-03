-- CitaFuego admin control plane expansion v3
-- Provider/runtime fixes, commercial switches, full Lima coverage, extensible locations,
-- Google OAuth configuration surface and automatic social-content safety classification.

alter table public.commercialization_providers drop constraint if exists commercialization_providers_provider_kind_check;
alter table public.commercialization_providers add constraint commercialization_providers_provider_kind_check check(provider_kind in ('ad_supply','payment_payout','auth'));
alter table public.commercialization_providers drop constraint if exists commercialization_providers_status_check;
alter table public.commercialization_providers add constraint commercialization_providers_status_check check(status in ('pending_credentials','configured','pending_provider_approval','sandbox','live','suspended'));

insert into public.commercialization_providers(provider_slug,display_name,provider_kind,status,public_config,secret_env_refs,notes)
values('google_oauth','Google OAuth','auth','pending_credentials',jsonb_build_object('redirect_uri','https://citafuego.com/auth/callback','scopes',jsonb_build_array('openid','email','profile')),array['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET'],'Credenciales de Google para login social. Activar también el proveedor Google en Supabase Auth cuando las credenciales estén completas.')
on conflict(provider_slug) do update set display_name=excluded.display_name,provider_kind=excluded.provider_kind,secret_env_refs=excluded.secret_env_refs,public_config=coalesce(public.commercialization_providers.public_config,excluded.public_config),updated_at=now();

grant execute on function public.admin_get_provider_config_status() to authenticated;
grant execute on function public.admin_set_provider_secret(text,text,text) to authenticated;
grant execute on function public.admin_set_provider_public_config(text,jsonb,text) to authenticated;
grant execute on function public.admin_get_monetization_metrics(integer) to authenticated;

create or replace function public.admin_get_provider_status_v2()
returns table(provider_slug text,display_name text,provider_kind text,status text,secrets_configured boolean,account_configured boolean,updated_at timestamptz)
language plpgsql stable security definer set search_path='public','pg_temp' as $$
begin
  if not public.admin_has_any_role(array['super_admin','finance','analyst']) then raise exception 'forbidden' using errcode='42501'; end if;
  return query select p.provider_slug,p.display_name,p.provider_kind,p.status,
    public.provider_credentials_complete(p.provider_slug),
    nullif(trim(coalesce(p.account_reference,'')),'') is not null,
    p.updated_at
  from public.commercialization_providers p order by p.provider_kind,p.provider_slug;
end;$$;
revoke all on function public.admin_get_provider_status_v2() from public,anon;
grant execute on function public.admin_get_provider_status_v2() to authenticated;

insert into public.feature_flags(key,enabled,config) values
 ('COMMERCIALIZATION_ENABLED',false,'{"requiresQualifiedUsers":100}'::jsonb),
 ('CREATOR_REWARDS_ENABLED',false,'{"requiresQualifiedUsers":100}'::jsonb),
 ('CREATOR_PAYOUTS_ENABLED',false,'{"requiresQualifiedUsers":100}'::jsonb),
 ('ADVERTISER_SELF_SERVICE_ENABLED',false,'{"requiresQualifiedUsers":100}'::jsonb),
 ('BRAND_MARKETPLACE_ENABLED',false,'{"requiresQualifiedUsers":100}'::jsonb),
 ('COMMERCIAL_FRAUD_MONITOR_ENABLED',true,'{}'::jsonb),
 ('EXOCLICK_ENABLED',false,'{"requiresQualifiedUsers":100}'::jsonb),
 ('SEGPAY_ENABLED',false,'{"requiresQualifiedUsers":100}'::jsonb),
 ('BLOG_MEDIA_ENABLED',true,'{}'::jsonb),
 ('STORY_MEDIA_ENABLED',true,'{}'::jsonb),
 ('CONTENT_AUTO_MODERATION_ENABLED',true,'{}'::jsonb),
 ('ACCOUNT_LOGIN_ENABLED',true,'{}'::jsonb),
 ('EMAIL_LOGIN_ENABLED',true,'{}'::jsonb),
 ('EMAIL_REGISTRATION_ENABLED',false,'{}'::jsonb),
 ('GOOGLE_LOGIN_ENABLED',false,'{}'::jsonb)
on conflict(key) do nothing;

create or replace function public.admin_set_feature_flag(p_key text,p_enabled boolean,p_reason text,p_confirmation text default null)
returns jsonb language plpgsql security definer set search_path='public','auth','pg_temp' as $$
declare old_enabled boolean; qualified integer:=0; threshold integer:=100; commercial boolean;
begin
 if not public.admin_has_any_role(array['super_admin']) then raise exception 'forbidden' using errcode='42501'; end if;
 if length(trim(coalesce(p_reason,'')))<5 then raise exception 'reason_required'; end if;
 select enabled into old_enabled from public.feature_flags where key=p_key for update;
 if not found then raise exception 'flag_not_found'; end if;
 commercial:=p_key=any(array['ADS_ENABLED','MEMBERSHIP_ENABLED','PAYMENTS_ENABLED','PAID_BOOST_ENABLED','COMMERCIALIZATION_ENABLED','CREATOR_REWARDS_ENABLED','CREATOR_PAYOUTS_ENABLED','ADVERTISER_SELF_SERVICE_ENABLED','BRAND_MARKETPLACE_ENABLED','EXOCLICK_ENABLED','SEGPAY_ENABLED']);
 if commercial and p_enabled then
   select coalesce((value #>> '{}')::int,100) into threshold from public.admin_operation_settings where key='commercialization_threshold';
   select count(distinct p.id)::int into qualified from public.profiles p
   join auth.users u on u.id=p.id join public.user_private priv on priv.user_id=p.id
   where p.country_code='PE' and lower(p.city)='lima' and p.profile_completion>=80 and p.status='active'
     and u.email_confirmed_at is not null and priv.birth_date<=current_date-interval '18 years'
     and exists(select 1 from public.profile_photos ph where ph.user_id=p.id and ph.status='approved');
   if qualified<threshold or p_confirmation<>'ACTIVAR' then raise exception 'commercial_gate_locked'; end if;
 end if;
 update public.feature_flags set enabled=p_enabled,updated_by=auth.uid(),updated_at=now() where key=p_key;
 insert into public.admin_audit_log(admin_user_id,action,object_type,object_id,reason,before_summary,after_summary)
 values(auth.uid(),'feature_flag_changed','feature_flag',p_key,left(trim(p_reason),500),jsonb_build_object('enabled',old_enabled),jsonb_build_object('enabled',p_enabled));
 return jsonb_build_object('ok',true,'key',p_key,'enabled',p_enabled);
end;$$;
revoke all on function public.admin_set_feature_flag(text,boolean,text,text) from public,anon;
grant execute on function public.admin_set_feature_flag(text,boolean,text,text) to authenticated;

alter table public.lima_district_settings add column if not exists city text not null default 'Lima';
alter table public.lima_district_settings add column if not exists province text not null default 'Lima';
alter table public.lima_district_settings add column if not exists country_code text not null default 'PE';
alter table public.lima_district_settings add column if not exists custom boolean not null default false;

insert into public.lima_district_settings(slug,name,status,minimum_active_profiles,nearby_districts,city,province,country_code,custom) values
('ancon','Ancón','soft_open',20,'{}','Lima','Lima','PE',false),
('ate','Ate','soft_open',20,'{}','Lima','Lima','PE',false),
('barranco','Barranco','soft_open',20,array['miraflores','chorrillos','surco'],'Lima','Lima','PE',false),
('brena','Breña','soft_open',20,'{}','Lima','Lima','PE',false),
('carabayllo','Carabayllo','soft_open',20,'{}','Lima','Lima','PE',false),
('chaclacayo','Chaclacayo','soft_open',20,'{}','Lima','Lima','PE',false),
('chorrillos','Chorrillos','soft_open',20,'{}','Lima','Lima','PE',false),
('cieneguilla','Cieneguilla','soft_open',20,'{}','Lima','Lima','PE',false),
('comas','Comas','soft_open',20,'{}','Lima','Lima','PE',false),
('el-agustino','El Agustino','soft_open',20,'{}','Lima','Lima','PE',false),
('independencia','Independencia','soft_open',20,'{}','Lima','Lima','PE',false),
('jesus-maria','Jesús María','soft_open',20,'{}','Lima','Lima','PE',false),
('la-molina','La Molina','soft_open',20,array['surco','san-borja','ate'],'Lima','Lima','PE',false),
('la-victoria','La Victoria','soft_open',20,'{}','Lima','Lima','PE',false),
('lima','Lima','soft_open',20,'{}','Lima','Lima','PE',false),
('lince','Lince','soft_open',20,'{}','Lima','Lima','PE',false),
('los-olivos','Los Olivos','soft_open',20,'{}','Lima','Lima','PE',false),
('lurigancho','Lurigancho','soft_open',20,'{}','Lima','Lima','PE',false),
('lurin','Lurín','soft_open',20,'{}','Lima','Lima','PE',false),
('magdalena-del-mar','Magdalena del Mar','soft_open',20,'{}','Lima','Lima','PE',false),
('miraflores','Miraflores','soft_open',20,array['san-isidro','barranco','surquillo','surco'],'Lima','Lima','PE',false),
('pachacamac','Pachacámac','soft_open',20,'{}','Lima','Lima','PE',false),
('pucusana','Pucusana','soft_open',20,'{}','Lima','Lima','PE',false),
('pueblo-libre','Pueblo Libre','soft_open',20,'{}','Lima','Lima','PE',false),
('puente-piedra','Puente Piedra','soft_open',20,'{}','Lima','Lima','PE',false),
('punta-hermosa','Punta Hermosa','soft_open',20,'{}','Lima','Lima','PE',false),
('punta-negra','Punta Negra','soft_open',20,'{}','Lima','Lima','PE',false),
('rimac','Rímac','soft_open',20,'{}','Lima','Lima','PE',false),
('san-bartolo','San Bartolo','soft_open',20,'{}','Lima','Lima','PE',false),
('san-borja','San Borja','soft_open',20,array['surco','surquillo','la-molina'],'Lima','Lima','PE',false),
('san-isidro','San Isidro','soft_open',20,array['miraflores','lince','magdalena-del-mar','jesus-maria'],'Lima','Lima','PE',false),
('san-juan-de-lurigancho','San Juan de Lurigancho','soft_open',20,'{}','Lima','Lima','PE',false),
('san-juan-de-miraflores','San Juan de Miraflores','soft_open',20,'{}','Lima','Lima','PE',false),
('san-luis','San Luis','soft_open',20,'{}','Lima','Lima','PE',false),
('san-martin-de-porres','San Martín de Porres','soft_open',20,'{}','Lima','Lima','PE',false),
('san-miguel','San Miguel','soft_open',20,'{}','Lima','Lima','PE',false),
('santa-anita','Santa Anita','soft_open',20,'{}','Lima','Lima','PE',false),
('santa-maria-del-mar','Santa María del Mar','soft_open',20,'{}','Lima','Lima','PE',false),
('santa-rosa','Santa Rosa','soft_open',20,'{}','Lima','Lima','PE',false),
('surco','Santiago de Surco','soft_open',20,array['miraflores','barranco','san-borja','la-molina'],'Lima','Lima','PE',false),
('surquillo','Surquillo','soft_open',20,'{}','Lima','Lima','PE',false),
('villa-el-salvador','Villa El Salvador','soft_open',20,'{}','Lima','Lima','PE',false),
('villa-maria-del-triunfo','Villa María del Triunfo','soft_open',20,'{}','Lima','Lima','PE',false)
on conflict(slug) do update set name=excluded.name,city='Lima',province='Lima',country_code='PE',custom=false;

create or replace function public.admin_get_location_metrics_v3()
returns table(slug text,name text,city text,province text,country_code text,status text,minimum_active_profiles integer,nearby_districts text[],active_profiles bigint,total_profiles bigint,custom boolean,updated_at timestamptz)
language plpgsql stable security definer set search_path='public','pg_temp' as $$
begin
  if not public.admin_has_any_role(array['super_admin','growth','analyst','seo']) then raise exception 'forbidden' using errcode='42501'; end if;
  return query select d.slug,d.name,d.city,d.province,d.country_code,d.status,d.minimum_active_profiles,d.nearby_districts,
    (select count(*) from public.profiles p where lower(coalesce(p.city,''))=lower(d.city) and lower(coalesce(p.district,''))=lower(d.name) and p.status='active' and p.last_active_at>=now()-interval '30 days'),
    (select count(*) from public.profiles p where lower(coalesce(p.city,''))=lower(d.city) and lower(coalesce(p.district,''))=lower(d.name)),d.custom,d.updated_at
  from public.lima_district_settings d order by d.city,d.name;
end;$$;

create or replace function public.admin_create_location(p_slug text,p_name text,p_city text,p_province text default null,p_country_code text default 'PE',p_status text default 'soft_open',p_minimum integer default 20,p_nearby text[] default '{}',p_reason text default 'Alta manual de ubicación')
returns jsonb language plpgsql security definer set search_path='public','auth','pg_temp' as $$
declare a uuid:=auth.uid(); s text:=lower(trim(coalesce(p_slug,'')));
begin
  if not public.admin_has_any_role(array['super_admin']) then raise exception 'forbidden' using errcode='42501'; end if;
  if s!~'^[a-z0-9]+(?:-[a-z0-9]+)*$' or length(s)<2 or length(s)>100 then raise exception 'invalid_slug'; end if;
  if length(trim(coalesce(p_name,'')))<2 or length(trim(coalesce(p_city,'')))<2 then raise exception 'invalid_location'; end if;
  if p_status not in('open','soft_open','closed') or p_minimum<0 or p_minimum>1000 then raise exception 'invalid_location_settings'; end if;
  insert into public.lima_district_settings(slug,name,status,minimum_active_profiles,nearby_districts,city,province,country_code,custom,updated_by,updated_at)
  values(s,trim(p_name),p_status,p_minimum,coalesce(p_nearby,'{}'),trim(p_city),coalesce(nullif(trim(p_province),''),trim(p_city)),upper(left(coalesce(nullif(trim(p_country_code),''),'PE'),2)),true,a,now());
  insert into public.admin_audit_log(admin_user_id,action,object_type,object_id,reason,after_summary)
  values(a,'location_created','location',s,left(trim(p_reason),500),jsonb_build_object('name',trim(p_name),'city',trim(p_city),'status',p_status,'minimum',p_minimum));
  return jsonb_build_object('ok',true,'slug',s);
exception when unique_violation then raise exception 'location_already_exists';
end;$$;

create or replace function public.admin_update_location_v3(p_slug text,p_name text,p_city text,p_province text,p_country_code text,p_status text,p_minimum integer,p_nearby text[],p_reason text)
returns jsonb language plpgsql security definer set search_path='public','auth','pg_temp' as $$
declare a uuid:=auth.uid(); before_row public.lima_district_settings%rowtype;
begin
 if not public.admin_has_any_role(array['super_admin']) then raise exception 'forbidden' using errcode='42501'; end if;
 if p_status not in('open','soft_open','closed') or p_minimum<0 or p_minimum>1000 or length(trim(coalesce(p_reason,'')))<5 then raise exception 'invalid_location_settings'; end if;
 select * into before_row from public.lima_district_settings where slug=p_slug for update; if not found then raise exception 'location_not_found'; end if;
 update public.lima_district_settings set name=trim(p_name),city=trim(p_city),province=coalesce(nullif(trim(p_province),''),trim(p_city)),country_code=upper(left(coalesce(nullif(trim(p_country_code),''),'PE'),2)),status=p_status,minimum_active_profiles=p_minimum,nearby_districts=coalesce(p_nearby,'{}'),updated_by=a,updated_at=now() where slug=p_slug;
 insert into public.admin_audit_log(admin_user_id,action,object_type,object_id,reason,before_summary,after_summary) values(a,'location_updated','location',p_slug,left(trim(p_reason),500),to_jsonb(before_row),(select to_jsonb(x) from public.lima_district_settings x where x.slug=p_slug));
 return jsonb_build_object('ok',true,'slug',p_slug);
end;$$;
revoke all on function public.admin_get_location_metrics_v3() from public,anon; grant execute on function public.admin_get_location_metrics_v3() to authenticated;
revoke all on function public.admin_create_location(text,text,text,text,text,text,integer,text[],text) from public,anon; grant execute on function public.admin_create_location(text,text,text,text,text,text,integer,text[],text) to authenticated;
revoke all on function public.admin_update_location_v3(text,text,text,text,text,text,integer,text[],text) from public,anon; grant execute on function public.admin_update_location_v3(text,text,text,text,text,text,integer,text[],text) to authenticated;

alter table public.blog_posts add column if not exists auto_moderation_status text not null default 'clean';
alter table public.blog_posts add column if not exists auto_moderation_score integer not null default 0;
alter table public.blog_posts add column if not exists auto_moderation_labels text[] not null default '{}';
alter table public.blog_posts add column if not exists auto_moderated_at timestamptz;
alter table public.stories add column if not exists auto_moderation_status text not null default 'clean';
alter table public.stories add column if not exists auto_moderation_score integer not null default 0;
alter table public.stories add column if not exists auto_moderation_labels text[] not null default '{}';
alter table public.stories add column if not exists auto_moderated_at timestamptz;

do $$ begin
 if not exists(select 1 from pg_constraint where conname='blog_posts_auto_moderation_status_check') then alter table public.blog_posts add constraint blog_posts_auto_moderation_status_check check(auto_moderation_status in('clean','review')); end if;
 if not exists(select 1 from pg_constraint where conname='stories_auto_moderation_status_check') then alter table public.stories add constraint stories_auto_moderation_status_check check(auto_moderation_status in('clean','review')); end if;
end $$;

create or replace function public.content_rule_scan(p_body text)
returns jsonb language plpgsql immutable set search_path='public','pg_temp' as $$
declare t text:=lower(coalesce(p_body,'')); labels text[]:='{}'; score integer:=0;
begin
  if t ~ '(menor de edad|soy menor|tengo (1[0-7]|[0-9]) años|niñ[oa]s? para citas)' then labels:=labels||array['minor_risk'];score:=score+100;end if;
  if t ~ '(pago por sexo|sexo por dinero|servicio sexual|tarifa por encuentro|cobro por encuentro)' then labels:=labels||array['paid_sex'];score:=score+90;end if;
  if t ~ '(te voy a matar|voy a matarte|amenaza de muerte|hacerte daño)' then labels:=labels||array['threat'];score:=score+90;end if;
  if t ~ '(usdt|bitcoin|western union|gift card|tarjeta de regalo)' and t ~ '(envía|envia|manda|paga|depósito|deposito|transferencia)' then labels:=labels||array['scam_payment'];score:=score+70;end if;
  if t ~ '(whatsapp|telegram)' and t ~ '(tarifa|paga|servicio sexual|encuentro por dinero)' then labels:=labels||array['off_platform_solicitation'];score:=score+60;end if;
  if length(t)>0 and (length(regexp_replace(t,'[^!]+','','g'))>=8 or length(regexp_replace(t,'[^A-Z]+','','g'))>120) then labels:=labels||array['spam_pattern'];score:=score+25;end if;
  return jsonb_build_object('status',case when score>=60 then 'review' else 'clean' end,'score',least(score,100),'labels',to_jsonb(labels));
end;$$;

create or replace function public.auto_moderate_social_text()
returns trigger language plpgsql security definer set search_path='public','pg_temp' as $$
declare scan jsonb; enabled boolean:=true;
begin
  select coalesce(f.enabled,true) into enabled from public.feature_flags f where f.key='CONTENT_AUTO_MODERATION_ENABLED';
  if not enabled then new.auto_moderation_status:='clean';new.auto_moderation_score:=0;new.auto_moderation_labels:='{}';new.auto_moderated_at:=now();return new;end if;
  scan:=public.content_rule_scan(new.body);
  new.auto_moderation_status:=coalesce(scan->>'status','clean');
  new.auto_moderation_score:=coalesce((scan->>'score')::integer,0);
  select coalesce(array_agg(value),'{}'::text[]) into new.auto_moderation_labels from jsonb_array_elements_text(coalesce(scan->'labels','[]'::jsonb));
  new.auto_moderated_at:=now();
  if tg_table_name='blog_posts' and new.auto_moderation_status='review' then new.recommendation_status:='blocked'; end if;
  return new;
end;$$;

create or replace function public.log_auto_moderation_event()
returns trigger language plpgsql security definer set search_path='public','pg_temp' as $$
begin
  if new.auto_moderation_status='review' and (tg_op='INSERT' or old.body is distinct from new.body or old.auto_moderation_status is distinct from new.auto_moderation_status) then
    insert into public.moderation_events(user_id,surface,object_type,object_id,provider,model_version,policy_version,labels,action,reasons,human_review)
    values(new.author_id,case when tg_table_name='blog_posts' then 'blog' else 'story' end,case when tg_table_name='blog_posts' then 'blog_post' else 'story' end,new.id::text,'cita_content_rules','rules-v3','2026-09-content-v3',jsonb_build_object('labels',new.auto_moderation_labels,'score',new.auto_moderation_score),'hold',new.auto_moderation_labels,true);
  end if;
  return new;
end;$$;

drop trigger if exists blog_posts_auto_moderate_text on public.blog_posts;
create trigger blog_posts_auto_moderate_text before insert or update of body on public.blog_posts for each row execute function public.auto_moderate_social_text();
drop trigger if exists blog_posts_auto_moderation_event on public.blog_posts;
create trigger blog_posts_auto_moderation_event after insert or update of body on public.blog_posts for each row execute function public.log_auto_moderation_event();
drop trigger if exists stories_auto_moderate_text on public.stories;
create trigger stories_auto_moderate_text before insert or update of body on public.stories for each row execute function public.auto_moderate_social_text();
drop trigger if exists stories_auto_moderation_event on public.stories;
create trigger stories_auto_moderation_event after insert or update of body on public.stories for each row execute function public.log_auto_moderation_event();

update public.blog_posts set body=body where body is not null;
update public.stories set body=body where body is not null;

create or replace function public.admin_get_content_feed_v3(p_limit integer default 200)
returns table(content_kind text,content_id uuid,author_id uuid,display_name text,body text,visibility text,lifecycle_status text,auto_moderation_status text,auto_moderation_score integer,auto_moderation_labels text[],recommendation_status text,created_at timestamptz,updated_at timestamptz)
language plpgsql stable security definer set search_path='public','pg_temp' as $$
begin
 if not public.admin_has_any_role(array['super_admin','trust_safety','content']) then raise exception 'forbidden' using errcode='42501'; end if;
 return query
 select x.content_kind,x.content_id,x.author_id,p.display_name,x.body,x.visibility,x.lifecycle_status,x.auto_moderation_status,x.auto_moderation_score,x.auto_moderation_labels,x.recommendation_status,x.created_at,x.updated_at
 from (
   select 'blog'::text content_kind,b.id content_id,b.author_id,b.body,b.visibility,b.status lifecycle_status,b.auto_moderation_status,b.auto_moderation_score,b.auto_moderation_labels,b.recommendation_status,b.created_at,b.updated_at from public.blog_posts b
   union all
   select 'story'::text,s.id,s.author_id,s.body,s.visibility,s.status,s.auto_moderation_status,s.auto_moderation_score,s.auto_moderation_labels,null::text,s.created_at,s.updated_at from public.stories s
 ) x left join public.profiles p on p.id=x.author_id
 order by x.created_at desc limit least(greatest(coalesce(p_limit,200),1),500);
end;$$;

create or replace function public.admin_rescan_content_v3(p_kind text,p_id uuid)
returns jsonb language plpgsql security definer set search_path='public','pg_temp' as $$
begin
 if not public.admin_has_any_role(array['super_admin','trust_safety','content']) then raise exception 'forbidden' using errcode='42501'; end if;
 if p_kind='blog' then update public.blog_posts set body=body where id=p_id; if not found then raise exception 'content_not_found'; end if;
 elsif p_kind='story' then update public.stories set body=body where id=p_id; if not found then raise exception 'content_not_found'; end if;
 else raise exception 'invalid_content_kind'; end if;
 return jsonb_build_object('ok',true,'kind',p_kind,'id',p_id);
end;$$;
revoke all on function public.admin_get_content_feed_v3(integer) from public,anon; grant execute on function public.admin_get_content_feed_v3(integer) to authenticated;
revoke all on function public.admin_rescan_content_v3(text,uuid) from public,anon; grant execute on function public.admin_rescan_content_v3(text,uuid) to authenticated;
