-- ================================================================
-- LOADOUT — Full Database Schema
-- Paste this entire file into: Supabase Dashboard → SQL Editor → Run
-- ================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Profiles ──────────────────────────────────────────────────
-- Extends Supabase auth.users with app-specific data
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  full_name    text,
  role         text not null default 'athlete' check (role in ('athlete', 'coach')),
  weight_class text,
  created_at   timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'role', 'athlete')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Coach–Athlete relationships ────────────────────────────────
create table public.coach_athlete (
  id         uuid primary key default uuid_generate_v4(),
  coach_id   uuid not null references public.profiles(id) on delete cascade,
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(coach_id, athlete_id)
);

-- ── Programs ──────────────────────────────────────────────────
create table public.programs (
  id          uuid primary key default uuid_generate_v4(),
  athlete_id  uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  week_number int not null default 1,
  start_date  date,
  raw_csv     text,
  created_at  timestamptz default now()
);

-- ── Sessions ──────────────────────────────────────────────────
create table public.sessions (
  id         uuid primary key default uuid_generate_v4(),
  program_id uuid not null references public.programs(id) on delete cascade,
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  day_label  text not null,       -- 'Mon', 'Tue', etc.
  session_date date,
  session_type text,              -- 'SQ/BP', 'DL', etc.
  created_at timestamptz default now()
);

-- ── Exercises (rows from CSV) ──────────────────────────────────
create table public.exercises (
  id           uuid primary key default uuid_generate_v4(),
  session_id   uuid not null references public.sessions(id) on delete cascade,
  athlete_id   uuid not null references public.profiles(id) on delete cascade,
  name         text not null,
  sets         int,
  reps         text,
  load_kg      numeric,
  rpe_target   numeric,
  notes        text,
  actual_load  numeric,
  actual_reps  text,
  actual_rpe   numeric,
  sort_order   int default 0,
  created_at   timestamptz default now()
);

-- ── Videos ────────────────────────────────────────────────────
create table public.videos (
  id          uuid primary key default uuid_generate_v4(),
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  athlete_id  uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,     -- path in Supabase Storage
  public_url   text,
  set_number   int default 1,
  created_at   timestamptz default now()
);

-- ── Coach Comments ────────────────────────────────────────────
create table public.comments (
  id          uuid primary key default uuid_generate_v4(),
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  coach_id    uuid not null references public.profiles(id) on delete cascade,
  athlete_id  uuid not null references public.profiles(id) on delete cascade,
  body        text not null,
  created_at  timestamptz default now()
);

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

alter table public.profiles      enable row level security;
alter table public.coach_athlete  enable row level security;
alter table public.programs       enable row level security;
alter table public.sessions       enable row level security;
alter table public.exercises      enable row level security;
alter table public.videos         enable row level security;
alter table public.comments       enable row level security;

-- Profiles: users can read their own + coach can read their athletes
create policy "profiles: own" on public.profiles for all using (auth.uid() = id);
create policy "profiles: coach reads athletes" on public.profiles for select
  using (exists (
    select 1 from public.coach_athlete ca
    where ca.coach_id = auth.uid() and ca.athlete_id = profiles.id
  ));

-- Coach-athlete: coaches manage their roster
create policy "coach_athlete: coach manages" on public.coach_athlete for all
  using (coach_id = auth.uid());
create policy "coach_athlete: athlete reads own" on public.coach_athlete for select
  using (athlete_id = auth.uid());

-- Programs: athlete owns, coach can read
create policy "programs: athlete" on public.programs for all using (athlete_id = auth.uid());
create policy "programs: coach reads" on public.programs for select
  using (exists (
    select 1 from public.coach_athlete ca
    where ca.coach_id = auth.uid() and ca.athlete_id = programs.athlete_id
  ));

-- Sessions
create policy "sessions: athlete" on public.sessions for all using (athlete_id = auth.uid());
create policy "sessions: coach reads" on public.sessions for select
  using (exists (
    select 1 from public.coach_athlete ca
    where ca.coach_id = auth.uid() and ca.athlete_id = sessions.athlete_id
  ));

-- Exercises
create policy "exercises: athlete" on public.exercises for all using (athlete_id = auth.uid());
create policy "exercises: coach reads" on public.exercises for select
  using (exists (
    select 1 from public.coach_athlete ca
    where ca.coach_id = auth.uid() and ca.athlete_id = exercises.athlete_id
  ));

-- Videos
create policy "videos: athlete" on public.videos for all using (athlete_id = auth.uid());
create policy "videos: coach reads" on public.videos for select
  using (exists (
    select 1 from public.coach_athlete ca
    where ca.coach_id = auth.uid() and ca.athlete_id = videos.athlete_id
  ));

-- Comments: coaches write, athletes read
create policy "comments: coach writes" on public.comments for all using (coach_id = auth.uid());
create policy "comments: athlete reads" on public.comments for select using (athlete_id = auth.uid());

-- ================================================================
-- STORAGE BUCKETS
-- ================================================================
-- Run these separately in the Supabase Dashboard → Storage → New Bucket
-- OR uncomment and run here if using service role:

-- insert into storage.buckets (id, name, public) values ('videos', 'videos', false);

-- Storage policies (run after creating bucket):
-- create policy "athletes upload own videos" on storage.objects for insert
--   with check (bucket_id = 'videos' and auth.uid()::text = (storage.foldername(name))[1]);
-- create policy "athletes read own videos" on storage.objects for select
--   using (bucket_id = 'videos' and auth.uid()::text = (storage.foldername(name))[1]);
-- create policy "coaches read athlete videos" on storage.objects for select
--   using (bucket_id = 'videos' and exists (
--     select 1 from public.coach_athlete ca
--     where ca.coach_id = auth.uid()
--     and ca.athlete_id = (storage.foldername(name))[1]::uuid
--   ));
