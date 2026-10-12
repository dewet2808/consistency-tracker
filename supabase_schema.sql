-- ============================================================
-- Consistency Tracker — Supabase Schema
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- ── Profiles ────────────────────────────────────────────────
create table if not exists profiles (
  id            uuid primary key references auth.users on delete cascade,
  trial_ends_at timestamptz default (now() + interval '14 days'),
  created_at    timestamptz default now()
);

alter table profiles enable row level security;
create policy "Users can manage own profile"
  on profiles for all using (auth.uid() = id);

-- Auto-create profile on sign-up
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ── Habits ──────────────────────────────────────────────────
create table if not exists habits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  name        text not null,
  icon        text,
  frequency   text not null default 'daily',
  target_days int  not null default 7,
  archived    boolean not null default false,
  created_at  timestamptz default now()
);

alter table habits enable row level security;
create policy "Users can manage own habits"
  on habits for all using (auth.uid() = user_id);

-- ── Habit completions ────────────────────────────────────────
create table if not exists habit_completions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  habit_id   uuid not null references habits on delete cascade,
  date       date not null,
  created_at timestamptz default now(),
  unique(habit_id, date)
);

alter table habit_completions enable row level security;
create policy "Users can manage own completions"
  on habit_completions for all using (auth.uid() = user_id);

-- ── Goals ───────────────────────────────────────────────────
create table if not exists goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  title       text not null check (char_length(title) <= 200),
  description text,
  category    text not null default 'Personal',
  goal_type   text not null default 'custom',
  metadata    jsonb not null default '{}',
  target_date date,
  progress    int  not null default 0 check (progress >= 0 and progress <= 100),
  completed   boolean not null default false,
  created_at  timestamptz default now()
);

alter table goals enable row level security;
create policy "Users can manage own goals"
  on goals for all using (auth.uid() = user_id);

-- ── Focus sessions ───────────────────────────────────────────
create table if not exists focus_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users on delete cascade,
  duration_minutes int  not null,
  label            text,
  started_at       timestamptz default now()
);

alter table focus_sessions enable row level security;
create policy "Users can manage own focus sessions"
  on focus_sessions for all using (auth.uid() = user_id);

-- ── Daily check-ins ──────────────────────────────────────────
create table if not exists check_ins (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  date       date not null,
  mood       int  check (mood between 1 and 5),
  energy     int  check (energy between 1 and 5),
  note       text,
  created_at timestamptz default now(),
  unique(user_id, date)
);

alter table check_ins enable row level security;
create policy "Users can manage own check-ins"
  on check_ins for all using (auth.uid() = user_id);

-- ── To-Do List ───────────────────────────────────────────────
create table if not exists todos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  title      text not null check (char_length(title) <= 500),
  completed  boolean not null default false,
  sort_order int  not null default 0,
  created_at timestamptz default now()
);

alter table todos enable row level security;
create policy "Users manage own todos"
  on todos for all using (auth.uid() = user_id);
