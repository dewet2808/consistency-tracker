-- Run this in Supabase SQL Editor as a new query

create table if not exists tasks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  title      text not null,
  recurrence text not null default 'weekly', -- 'weekly' | 'once'
  days       int[],   -- [0..6] where 0=Sun,1=Mon,...6=Sat  (for weekly)
  due_date   date,    -- specific date (for once-off)
  created_at timestamptz default now()
);

alter table tasks enable row level security;
create policy "Users can manage own tasks"
  on tasks for all using (auth.uid() = user_id);

create table if not exists task_completions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  task_id    uuid not null references tasks on delete cascade,
  date       date not null,
  created_at timestamptz default now(),
  unique(task_id, date)
);

alter table task_completions enable row level security;
create policy "Users can manage own task completions"
  on task_completions for all using (auth.uid() = user_id);
