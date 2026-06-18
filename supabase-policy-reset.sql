-- Couplee v6 policy reset
-- Supabase SQL Editorで、supabase-schema.sql を再実行する前にこのSQLを実行してください。
-- 目的: "policy already exists" エラーを避けるため、Couplee v6が作成するRLS policyだけを削除します。

-- profiles
drop policy if exists "profiles_select_own_and_partner" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

-- couples
drop policy if exists "couples_insert_creator" on public.couples;
drop policy if exists "couples_select_members" on public.couples;
drop policy if exists "couples_update_members" on public.couples;

-- couple_members
drop policy if exists "members_select_same_couple" on public.couple_members;
drop policy if exists "members_insert_self" on public.couple_members;
drop policy if exists "members_delete_self" on public.couple_members;

-- daily_answers
drop policy if exists "daily_select_members" on public.daily_answers;
drop policy if exists "daily_insert_members_self" on public.daily_answers;
drop policy if exists "daily_update_self" on public.daily_answers;
drop policy if exists "daily_delete_self" on public.daily_answers;

-- memories
drop policy if exists "memories_select_members" on public.memories;
drop policy if exists "memories_insert_members" on public.memories;
drop policy if exists "memories_update_creator" on public.memories;
drop policy if exists "memories_delete_creator" on public.memories;

-- requests
drop policy if exists "requests_select_members" on public.requests;
drop policy if exists "requests_insert_members" on public.requests;
drop policy if exists "requests_update_members" on public.requests;
drop policy if exists "requests_delete_creator" on public.requests;

-- events
drop policy if exists "events_select_members" on public.events;
drop policy if exists "events_insert_members" on public.events;
drop policy if exists "events_update_members" on public.events;
drop policy if exists "events_delete_creator" on public.events;

-- todos
drop policy if exists "todos_select_members" on public.todos;
drop policy if exists "todos_insert_members" on public.todos;
drop policy if exists "todos_update_members" on public.todos;
drop policy if exists "todos_delete_creator" on public.todos;

-- privacy_settings
drop policy if exists "privacy_select_members" on public.privacy_settings;
drop policy if exists "privacy_insert_members" on public.privacy_settings;
drop policy if exists "privacy_update_members" on public.privacy_settings;
