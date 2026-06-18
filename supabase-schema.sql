-- Couplee v6.2 Easy Link Schema
-- 目的：メール登録なし・招待コード手入力なしで、リンクを開くだけの簡単連携に対応します。
-- 既存データは削除しません。テーブル・関数・RLSポリシーを再作成可能な形で更新します。

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_data_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  invite_code text unique not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  partner_name_hint text,
  start_date date not null,
  anniversary_name text not null default '交際記念日',
  phase text not null default '安定期',
  goal text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.couple_members (
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'partner',
  joined_at timestamptz not null default now(),
  primary key (couple_id, user_id)
);

create table if not exists public.daily_answers (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_date date not null,
  question_text text not null,
  answer text,
  mood text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(couple_id, user_id, question_date)
);

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  caption text,
  place text,
  memory_date date not null,
  image_data_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  detail text,
  status text not null default 'pending' check (status in ('pending','accepted','done')),
  reward_points integer not null default 30,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  event_date date not null,
  event_time time,
  note text,
  event_type text not null default 'date',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  owner_user_id uuid references auth.users(id) on delete set null,
  title text not null,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.privacy_settings (
  couple_id uuid primary key references public.couples(id) on delete cascade,
  location_enabled boolean not null default false,
  location_mode text not null default 'timed' check (location_mode in ('always','timed','emergency')),
  consent_required boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create or replace function public.is_couple_member(target_couple_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.couple_members cm
    where cm.couple_id = target_couple_id
      and cm.user_id = auth.uid()
  );
$$;

create or replace function public.create_couple_room(
  p_partner_name_hint text,
  p_start_date date,
  p_anniversary_name text default '交際記念日',
  p_phase text default '安定期',
  p_goal text default null
)
returns table(couple_id uuid, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_couple_id uuid;
  new_invite_code text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  loop
    new_invite_code := 'CPL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.couples c where c.invite_code = new_invite_code);
  end loop;

  insert into public.couples(
    invite_code,
    created_by,
    partner_name_hint,
    start_date,
    anniversary_name,
    phase,
    goal
  ) values (
    new_invite_code,
    auth.uid(),
    nullif(trim(coalesce(p_partner_name_hint, '')), ''),
    p_start_date,
    coalesce(nullif(trim(p_anniversary_name), ''), '交際記念日'),
    coalesce(nullif(trim(p_phase), ''), '安定期'),
    nullif(trim(coalesce(p_goal, '')), '')
  ) returning id into new_couple_id;

  insert into public.couple_members(couple_id, user_id, role)
  values (new_couple_id, auth.uid(), 'owner')
  on conflict (couple_id, user_id) do nothing;

  insert into public.privacy_settings(couple_id, location_enabled, location_mode, consent_required, updated_by)
  values (new_couple_id, false, 'timed', true, auth.uid())
  on conflict (couple_id) do nothing;

  couple_id := new_couple_id;
  invite_code := new_invite_code;
  return next;
end;
$$;

create or replace function public.join_couple_by_invite(invite text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  current_count integer;
  already_member boolean;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select id into target_id
  from public.couples
  where invite_code = upper(trim(invite))
  limit 1;

  if target_id is null then
    raise exception '招待リンクが無効です';
  end if;

  select exists(
    select 1 from public.couple_members
    where couple_id = target_id and user_id = auth.uid()
  ) into already_member;

  select count(*) into current_count
  from public.couple_members
  where couple_id = target_id;

  if current_count >= 2 and not already_member then
    raise exception 'このカップルルームはすでに2人で連携済みです';
  end if;

  insert into public.couple_members(couple_id, user_id, role)
  values (target_id, auth.uid(), 'partner')
  on conflict (couple_id, user_id) do nothing;

  return target_id;
end;
$$;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.is_couple_member(uuid) to authenticated;
grant execute on function public.create_couple_room(text, date, text, text, text) to authenticated;
grant execute on function public.join_couple_by_invite(text) to authenticated;

alter table public.profiles enable row level security;
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.daily_answers enable row level security;
alter table public.memories enable row level security;
alter table public.requests enable row level security;
alter table public.events enable row level security;
alter table public.todos enable row level security;
alter table public.privacy_settings enable row level security;

-- 再実行対応: 既存ポリシーを削除してから作り直します。
drop policy if exists "profiles_select_own_and_partner" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "couples_insert_creator" on public.couples;
drop policy if exists "couples_select_members" on public.couples;
drop policy if exists "couples_update_members" on public.couples;
drop policy if exists "members_select_same_couple" on public.couple_members;
drop policy if exists "members_insert_self" on public.couple_members;
drop policy if exists "members_delete_self" on public.couple_members;
drop policy if exists "daily_select_members" on public.daily_answers;
drop policy if exists "daily_insert_members_self" on public.daily_answers;
drop policy if exists "daily_update_self" on public.daily_answers;
drop policy if exists "daily_delete_self" on public.daily_answers;
drop policy if exists "memories_select_members" on public.memories;
drop policy if exists "memories_insert_members" on public.memories;
drop policy if exists "memories_update_creator" on public.memories;
drop policy if exists "memories_delete_creator" on public.memories;
drop policy if exists "requests_select_members" on public.requests;
drop policy if exists "requests_insert_members" on public.requests;
drop policy if exists "requests_update_members" on public.requests;
drop policy if exists "requests_delete_creator" on public.requests;
drop policy if exists "events_select_members" on public.events;
drop policy if exists "events_insert_members" on public.events;
drop policy if exists "events_update_members" on public.events;
drop policy if exists "events_delete_creator" on public.events;
drop policy if exists "todos_select_members" on public.todos;
drop policy if exists "todos_insert_members" on public.todos;
drop policy if exists "todos_update_members" on public.todos;
drop policy if exists "todos_delete_creator" on public.todos;
drop policy if exists "privacy_select_members" on public.privacy_settings;
drop policy if exists "privacy_insert_members" on public.privacy_settings;
drop policy if exists "privacy_update_members" on public.privacy_settings;

create policy "profiles_select_own_and_partner" on public.profiles
for select using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.couple_members mine
    join public.couple_members other on other.couple_id = mine.couple_id
    where mine.user_id = auth.uid()
      and other.user_id = profiles.user_id
  )
);
create policy "profiles_insert_own" on public.profiles
for insert with check (user_id = auth.uid());
create policy "profiles_update_own" on public.profiles
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "couples_insert_creator" on public.couples
for insert with check (created_by = auth.uid());
create policy "couples_select_members" on public.couples
for select using (public.is_couple_member(id));
create policy "couples_update_members" on public.couples
for update using (public.is_couple_member(id)) with check (public.is_couple_member(id));

create policy "members_select_same_couple" on public.couple_members
for select using (user_id = auth.uid() or public.is_couple_member(couple_id));
create policy "members_insert_self" on public.couple_members
for insert with check (user_id = auth.uid());
create policy "members_delete_self" on public.couple_members
for delete using (user_id = auth.uid());

create policy "daily_select_members" on public.daily_answers
for select using (public.is_couple_member(couple_id));
create policy "daily_insert_members_self" on public.daily_answers
for insert with check (public.is_couple_member(couple_id) and user_id = auth.uid());
create policy "daily_update_self" on public.daily_answers
for update using (public.is_couple_member(couple_id) and user_id = auth.uid()) with check (public.is_couple_member(couple_id) and user_id = auth.uid());
create policy "daily_delete_self" on public.daily_answers
for delete using (public.is_couple_member(couple_id) and user_id = auth.uid());

create policy "memories_select_members" on public.memories
for select using (public.is_couple_member(couple_id));
create policy "memories_insert_members" on public.memories
for insert with check (public.is_couple_member(couple_id) and created_by = auth.uid());
create policy "memories_update_creator" on public.memories
for update using (public.is_couple_member(couple_id) and created_by = auth.uid()) with check (public.is_couple_member(couple_id));
create policy "memories_delete_creator" on public.memories
for delete using (public.is_couple_member(couple_id) and created_by = auth.uid());

create policy "requests_select_members" on public.requests
for select using (public.is_couple_member(couple_id));
create policy "requests_insert_members" on public.requests
for insert with check (public.is_couple_member(couple_id) and created_by = auth.uid());
create policy "requests_update_members" on public.requests
for update using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
create policy "requests_delete_creator" on public.requests
for delete using (public.is_couple_member(couple_id) and created_by = auth.uid());

create policy "events_select_members" on public.events
for select using (public.is_couple_member(couple_id));
create policy "events_insert_members" on public.events
for insert with check (public.is_couple_member(couple_id) and created_by = auth.uid());
create policy "events_update_members" on public.events
for update using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
create policy "events_delete_creator" on public.events
for delete using (public.is_couple_member(couple_id) and created_by = auth.uid());

create policy "todos_select_members" on public.todos
for select using (public.is_couple_member(couple_id));
create policy "todos_insert_members" on public.todos
for insert with check (public.is_couple_member(couple_id) and created_by = auth.uid());
create policy "todos_update_members" on public.todos
for update using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
create policy "todos_delete_creator" on public.todos
for delete using (public.is_couple_member(couple_id) and created_by = auth.uid());

create policy "privacy_select_members" on public.privacy_settings
for select using (public.is_couple_member(couple_id));
create policy "privacy_insert_members" on public.privacy_settings
for insert with check (public.is_couple_member(couple_id));
create policy "privacy_update_members" on public.privacy_settings
for update using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
