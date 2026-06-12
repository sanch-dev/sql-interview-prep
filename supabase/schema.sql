-- Run this in your Supabase project: Dashboard → SQL Editor → New query

create table public.user_progress (
  id           uuid         default gen_random_uuid() primary key,
  user_id      uuid         references auth.users(id) on delete cascade not null,
  question_id  text         not null,
  status       text         check (status in ('attempted', 'solved')) not null,
  solution     text,
  updated_at   timestamptz  default now(),
  unique (user_id, question_id)
);

alter table public.user_progress enable row level security;

create policy "users_own_progress"
  on public.user_progress
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Optional: auto-update timestamp on upsert
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_progress_updated_at
  before update on public.user_progress
  for each row execute procedure public.touch_updated_at();
