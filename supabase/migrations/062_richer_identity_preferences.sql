-- Optional identity/desire details. These are sensitive profile data and are hidden by default until the user opts in to profile display.
create table if not exists public.profile_identity_details(
 user_id uuid primary key references auth.users(id) on delete cascade,
 pronouns text check(pronouns is null or char_length(pronouns)<=40),
 sexual_orientations text[] not null default '{}',
 relationship_styles text[] not null default '{}',
 desires text[] not null default '{}',
 languages text[] not null default '{}',
 show_on_profile boolean not null default false,
 updated_at timestamptz not null default now()
);
alter table public.profile_identity_details enable row level security;
drop policy if exists profile_identity_details_self_read on public.profile_identity_details;create policy profile_identity_details_self_read on public.profile_identity_details for select to authenticated using(user_id=auth.uid());
revoke insert,update,delete on public.profile_identity_details from authenticated,anon;grant select on public.profile_identity_details to authenticated;

create or replace function public.save_my_identity_details(p_pronouns text,p_orientations text[],p_styles text[],p_desires text[],p_languages text[],p_show boolean)
returns jsonb language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid();allowed_orientations text[]:=array['heterosexual','gay','lesbian','bisexual','pansexual','asexual','demisexual','queer','questioning'];allowed_styles text[]:=array['monogamous','open_relationship','polyamorous','non_monogamous','single','exploring'];allowed_desires text[]:=array['dating','relationship','friendship','casual','conversation','events','travel','kink_friendly','slow_dating','long_term'];begin
 if u is null then raise exception'not_authenticated';end if;
 if char_length(coalesce(p_pronouns,''))>40 then raise exception'invalid_pronouns';end if;
 if coalesce(array_length(p_orientations,1),0)>5 or exists(select 1 from unnest(coalesce(p_orientations,'{}'))x where not(x=any(allowed_orientations)))then raise exception'invalid_orientation';end if;
 if coalesce(array_length(p_styles,1),0)>4 or exists(select 1 from unnest(coalesce(p_styles,'{}'))x where not(x=any(allowed_styles)))then raise exception'invalid_style';end if;
 if coalesce(array_length(p_desires,1),0)>8 or exists(select 1 from unnest(coalesce(p_desires,'{}'))x where not(x=any(allowed_desires)))then raise exception'invalid_desire';end if;
 if coalesce(array_length(p_languages,1),0)>6 or exists(select 1 from unnest(coalesce(p_languages,'{}'))x where char_length(x)<2 or char_length(x)>30)then raise exception'invalid_language';end if;
 insert into public.profile_identity_details(user_id,pronouns,sexual_orientations,relationship_styles,desires,languages,show_on_profile,updated_at)
 values(u,nullif(trim(p_pronouns),''),coalesce(p_orientations,'{}'),coalesce(p_styles,'{}'),coalesce(p_desires,'{}'),coalesce(p_languages,'{}'),coalesce(p_show,false),now())
 on conflict(user_id)do update set pronouns=excluded.pronouns,sexual_orientations=excluded.sexual_orientations,relationship_styles=excluded.relationship_styles,desires=excluded.desires,languages=excluded.languages,show_on_profile=excluded.show_on_profile,updated_at=now();
 return jsonb_build_object('ok',true);
end;$$;
revoke all on function public.save_my_identity_details(text,text[],text[],text[],text[],boolean) from public,anon;grant execute on function public.save_my_identity_details(text,text[],text[],text[],text[],boolean) to authenticated;

create or replace function public.get_public_identity_details(p_user uuid)
returns table(pronouns text,sexual_orientations text[],relationship_styles text[],desires text[],languages text[]) language plpgsql security definer stable set search_path=public as $$declare u uuid:=auth.uid();begin if u is null then raise exception'not_authenticated';end if;if p_user<>u and(not exists(select 1 from public.profiles p where p.id=p_user and p.status='active')or exists(select 1 from public.blocks b where(b.blocker_id=u and b.blocked_id=p_user)or(b.blocker_id=p_user and b.blocked_id=u)))then return;end if;return query select d.pronouns,d.sexual_orientations,d.relationship_styles,d.desires,d.languages from public.profile_identity_details d where d.user_id=p_user and(d.user_id=u or d.show_on_profile);end;$$;
revoke all on function public.get_public_identity_details(uuid) from public,anon;grant execute on function public.get_public_identity_details(uuid) to authenticated;
