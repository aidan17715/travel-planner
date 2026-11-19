-- Travel Planner: shared trips.
-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query -> Run).
--
-- Access model: a trip is visible and editable only to its members. People become members by
-- opening an invite link created by the trip's owner. Only the owner can create or revoke links,
-- remove people, or stop sharing (delete) the trip.

-- ---------------------------------------------------------------- tables

create table if not exists public.trips (
  id          uuid primary key,
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data        jsonb not null,
  rev         integer not null default 1,
  updated_at  timestamptz not null default now()
);

create table if not exists public.trip_members (
  trip_id  uuid not null references public.trips (id) on delete cascade,
  user_id  uuid not null references auth.users (id) on delete cascade,
  email    text not null default '',
  role     text not null check (role in ('owner', 'editor')),
  primary key (trip_id, user_id)
);

create table if not exists public.trip_invite_links (
  token       text primary key default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  trip_id     uuid not null references public.trips (id) on delete cascade,
  created_by  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  expires_at  timestamptz not null
);

create index if not exists trip_members_user_idx on public.trip_members (user_id);
create index if not exists trip_invite_links_trip_idx on public.trip_invite_links (trip_id);

-- ---------------------------------------------------------------- helpers

-- security definer so policies can ask "is this user a member?" without recursing into RLS
create or replace function public.is_trip_member(t uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.trip_members where trip_id = t and user_id = auth.uid());
$$;

create or replace function public.is_trip_owner(t uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.trips where id = t and owner_id = auth.uid());
$$;

-- The creator of a trip is automatically its owner member
create or replace function public.add_owner_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.trip_members (trip_id, user_id, email, role)
  values (new.id, new.owner_id, coalesce(auth.jwt() ->> 'email', ''), 'owner');
  return new;
end;
$$;

drop trigger if exists trips_add_owner on public.trips;
create trigger trips_add_owner after insert on public.trips
  for each row execute function public.add_owner_member();

create or replace function public.touch_trip()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trips_touch on public.trips;
create trigger trips_touch before update on public.trips
  for each row execute function public.touch_trip();

-- Joins the signed-in user to the trip behind a valid, unexpired invite link
create or replace function public.join_trip(link_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip uuid;
begin
  if auth.uid() is null then
    return null;
  end if;

  select trip_id into v_trip
  from public.trip_invite_links
  where token = link_token and expires_at > now();

  if v_trip is null then
    return null;
  end if;

  insert into public.trip_members (trip_id, user_id, email, role)
  values (v_trip, auth.uid(), coalesce(auth.jwt() ->> 'email', ''), 'editor')
  on conflict (trip_id, user_id) do nothing;

  return v_trip;
end;
$$;

revoke all on function public.join_trip(text) from public, anon;
grant execute on function public.join_trip(text) to authenticated;

-- ---------------------------------------------------------------- row level security

alter table public.trips            enable row level security;
alter table public.trip_members     enable row level security;
alter table public.trip_invite_links enable row level security;

-- trips: members read and edit; only the creator can add (as owner) or delete
drop policy if exists trips_select on public.trips;
create policy trips_select on public.trips for select to authenticated
  using (public.is_trip_member(id));

drop policy if exists trips_insert on public.trips;
create policy trips_insert on public.trips for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists trips_update on public.trips;
create policy trips_update on public.trips for update to authenticated
  using (public.is_trip_member(id))
  with check (public.is_trip_member(id));

drop policy if exists trips_delete on public.trips;
create policy trips_delete on public.trips for delete to authenticated
  using (owner_id = auth.uid());

-- members can change only the trip contents, never who owns it
revoke update on public.trips from authenticated;
grant update (data, rev) on public.trips to authenticated;

-- trip_members: visible to the trip's members; the owner can remove others, anyone can leave.
-- Rows are only ever added by the trigger and join_trip(), never directly.
drop policy if exists members_select on public.trip_members;
create policy members_select on public.trip_members for select to authenticated
  using (public.is_trip_member(trip_id));

drop policy if exists members_delete on public.trip_members;
create policy members_delete on public.trip_members for delete to authenticated
  using (
    role <> 'owner'
    and (user_id = auth.uid() or public.is_trip_owner(trip_id))
  );

revoke insert, update on public.trip_members from authenticated;

-- invite links: only the trip's owner can see, create or revoke them
drop policy if exists links_select on public.trip_invite_links;
create policy links_select on public.trip_invite_links for select to authenticated
  using (public.is_trip_owner(trip_id));

drop policy if exists links_insert on public.trip_invite_links;
create policy links_insert on public.trip_invite_links for insert to authenticated
  with check (public.is_trip_owner(trip_id) and created_by = auth.uid());

drop policy if exists links_delete on public.trip_invite_links;
create policy links_delete on public.trip_invite_links for delete to authenticated
  using (public.is_trip_owner(trip_id));

-- Nothing is readable or writable without signing in
revoke all on public.trips, public.trip_members, public.trip_invite_links from anon;

-- ---------------------------------------------------------------- realtime

-- Lets other devices receive changes to shared trips as they happen
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'trips'
  ) then
    alter publication supabase_realtime add table public.trips;
  end if;
end;
$$;
