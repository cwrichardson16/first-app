-- Cut: personal fitness tracker — initial schema
-- Run this against your Supabase project.

-- ============================================================================
-- Tables
-- ============================================================================

create table if not exists user_settings (
  user_id uuid primary key references auth.users on delete cascade,
  display_name text,
  calorie_target int not null default 1950,
  protein_target int not null default 200,
  fat_target int not null default 65,
  carb_target int not null default 150,
  water_target_oz int not null default 128,
  step_target int not null default 10000,
  sleep_target_hours numeric(3,1) not null default 8,
  start_weight numeric(5,2),
  goal_weight numeric(5,2),
  weekly_loss_target numeric(3,2) default 1.25,
  units text not null default 'imperial' check (units in ('imperial','metric')),
  timezone text not null default 'America/New_York',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- daily_logs holds the per-day fields that are entered directly (weight,
-- steps, sleep, notes). Macro/water totals are NOT stored here — they're
-- derived from food_entries / water_entries on read for simplicity.
create table if not exists daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  log_date date not null,
  weight numeric(5,2),
  steps int,
  sleep_hours numeric(3,1),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, log_date)
);
create index if not exists idx_daily_logs_user_date on daily_logs(user_id, log_date desc);

create table if not exists quick_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  calories int not null,
  protein int not null,
  fat int not null,
  carbs int not null,
  emoji text,
  sort_order int default 0,
  created_at timestamptz default now()
);
create index if not exists idx_quick_meals_user on quick_meals(user_id, sort_order);

create table if not exists food_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  log_date date not null,
  name text not null,
  calories int not null default 0,
  protein int not null default 0,
  fat int not null default 0,
  carbs int not null default 0,
  quick_meal_id uuid references quick_meals on delete set null,
  created_at timestamptz default now()
);
create index if not exists idx_food_entries_user_date on food_entries(user_id, log_date desc);

create table if not exists water_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  log_date date not null,
  amount_oz int not null,
  logged_at timestamptz default now()
);
create index if not exists idx_water_entries_user_date on water_entries(user_id, log_date desc);

create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  workout_date date not null,
  name text not null,
  notes text,
  duration_minutes int,
  created_at timestamptz default now()
);
create index if not exists idx_workouts_user_date on workouts(user_id, workout_date desc);

-- exercise_order preserves which exercise came first within a workout.
-- All sets of the same exercise share the same exercise_order.
create table if not exists exercise_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts on delete cascade,
  exercise_name text not null,
  exercise_order int not null default 0,
  set_number int not null,
  weight numeric(6,2),
  reps int,
  rpe numeric(3,1),
  created_at timestamptz default now()
);
create index if not exists idx_sets_workout on exercise_sets(workout_id, exercise_order, set_number);
create index if not exists idx_sets_exercise_name on exercise_sets(exercise_name);

create table if not exists progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  photo_date date not null,
  storage_path text not null,
  weight_at_time numeric(5,2),
  pose text check (pose in ('front','side','back','other')) default 'front',
  notes text,
  created_at timestamptz default now()
);
create index if not exists idx_photos_user_date on progress_photos(user_id, photo_date desc);

create table if not exists partner_link (
  user_id uuid primary key references auth.users on delete cascade,
  partner_id uuid not null references auth.users on delete cascade,
  created_at timestamptz default now()
);

-- ============================================================================
-- Trigger: auto-create user_settings on signup
-- ============================================================================

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.user_settings (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================================
-- RLS — enable on all tables
-- ============================================================================

alter table user_settings enable row level security;
alter table daily_logs enable row level security;
alter table quick_meals enable row level security;
alter table food_entries enable row level security;
alter table water_entries enable row level security;
alter table workouts enable row level security;
alter table exercise_sets enable row level security;
alter table progress_photos enable row level security;
alter table partner_link enable row level security;

-- helper: returns the partner_id for the current user, or null
create or replace function current_partner_id() returns uuid
language sql stable security definer set search_path = public
as $$
  select partner_id from partner_link where user_id = auth.uid();
$$;

-- user_settings: self CRUD + partner SELECT (so partner page can read targets)
create policy "user_settings_select_own_or_partner" on user_settings for select
  using (user_id = auth.uid() or user_id = current_partner_id());
create policy "user_settings_insert_own" on user_settings for insert
  with check (user_id = auth.uid());
create policy "user_settings_update_own" on user_settings for update
  using (user_id = auth.uid());
create policy "user_settings_delete_own" on user_settings for delete
  using (user_id = auth.uid());

-- daily_logs: self CRUD + partner SELECT
create policy "daily_logs_select_own_or_partner" on daily_logs for select
  using (user_id = auth.uid() or user_id = current_partner_id());
create policy "daily_logs_insert_own" on daily_logs for insert
  with check (user_id = auth.uid());
create policy "daily_logs_update_own" on daily_logs for update
  using (user_id = auth.uid());
create policy "daily_logs_delete_own" on daily_logs for delete
  using (user_id = auth.uid());

-- food_entries: self CRUD + partner SELECT
create policy "food_entries_select_own_or_partner" on food_entries for select
  using (user_id = auth.uid() or user_id = current_partner_id());
create policy "food_entries_insert_own" on food_entries for insert
  with check (user_id = auth.uid());
create policy "food_entries_update_own" on food_entries for update
  using (user_id = auth.uid());
create policy "food_entries_delete_own" on food_entries for delete
  using (user_id = auth.uid());

-- water_entries: self CRUD + partner SELECT
create policy "water_entries_select_own_or_partner" on water_entries for select
  using (user_id = auth.uid() or user_id = current_partner_id());
create policy "water_entries_insert_own" on water_entries for insert
  with check (user_id = auth.uid());
create policy "water_entries_update_own" on water_entries for update
  using (user_id = auth.uid());
create policy "water_entries_delete_own" on water_entries for delete
  using (user_id = auth.uid());

-- quick_meals: self only
create policy "quick_meals_select_own" on quick_meals for select
  using (user_id = auth.uid());
create policy "quick_meals_insert_own" on quick_meals for insert
  with check (user_id = auth.uid());
create policy "quick_meals_update_own" on quick_meals for update
  using (user_id = auth.uid());
create policy "quick_meals_delete_own" on quick_meals for delete
  using (user_id = auth.uid());

-- workouts: self CRUD + partner SELECT
create policy "workouts_select_own_or_partner" on workouts for select
  using (user_id = auth.uid() or user_id = current_partner_id());
create policy "workouts_insert_own" on workouts for insert
  with check (user_id = auth.uid());
create policy "workouts_update_own" on workouts for update
  using (user_id = auth.uid());
create policy "workouts_delete_own" on workouts for delete
  using (user_id = auth.uid());

-- exercise_sets: self CRUD + partner SELECT (gated by parent workout)
create policy "exercise_sets_select_own_or_partner" on exercise_sets for select
  using (
    exists (
      select 1 from workouts
      where workouts.id = exercise_sets.workout_id
        and (workouts.user_id = auth.uid() or workouts.user_id = current_partner_id())
    )
  );
create policy "exercise_sets_insert_own" on exercise_sets for insert
  with check (
    exists (select 1 from workouts where workouts.id = exercise_sets.workout_id and workouts.user_id = auth.uid())
  );
create policy "exercise_sets_update_own" on exercise_sets for update
  using (
    exists (select 1 from workouts where workouts.id = exercise_sets.workout_id and workouts.user_id = auth.uid())
  );
create policy "exercise_sets_delete_own" on exercise_sets for delete
  using (
    exists (select 1 from workouts where workouts.id = exercise_sets.workout_id and workouts.user_id = auth.uid())
  );

-- progress_photos: self CRUD + partner SELECT
create policy "progress_photos_select_own_or_partner" on progress_photos for select
  using (user_id = auth.uid() or user_id = current_partner_id());
create policy "progress_photos_insert_own" on progress_photos for insert
  with check (user_id = auth.uid());
create policy "progress_photos_update_own" on progress_photos for update
  using (user_id = auth.uid());
create policy "progress_photos_delete_own" on progress_photos for delete
  using (user_id = auth.uid());

-- partner_link: self only (read & write your own row)
create policy "partner_link_select_own" on partner_link for select
  using (user_id = auth.uid());
create policy "partner_link_insert_own" on partner_link for insert
  with check (user_id = auth.uid());
create policy "partner_link_update_own" on partner_link for update
  using (user_id = auth.uid());
create policy "partner_link_delete_own" on partner_link for delete
  using (user_id = auth.uid());

-- ============================================================================
-- Storage bucket: progress-photos
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

create policy "photos_select_own_or_partner" on storage.objects for select
  using (
    bucket_id = 'progress-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[1] = (select partner_id::text from partner_link where user_id = auth.uid())
    )
  );
create policy "photos_insert_own" on storage.objects for insert
  with check (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "photos_update_own" on storage.objects for update
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "photos_delete_own" on storage.objects for delete
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- updated_at triggers
-- ============================================================================

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists user_settings_updated_at on user_settings;
create trigger user_settings_updated_at before update on user_settings
  for each row execute function set_updated_at();

drop trigger if exists daily_logs_updated_at on daily_logs;
create trigger daily_logs_updated_at before update on daily_logs
  for each row execute function set_updated_at();
