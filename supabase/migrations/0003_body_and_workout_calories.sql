-- Body composition profile fields enable BMR / TDEE / BMI calculations.
-- All optional — UI falls back gracefully when missing.
alter table user_settings
  add column if not exists height_in numeric(5,2),
  add column if not exists sex text check (sex in ('male','female','other')),
  add column if not exists birthdate date,
  add column if not exists activity_level text check (
    activity_level in ('sedentary','light','moderate','active','very_active')
  ) default 'moderate';

-- Workout calorie burn: store the intensity picked at log time and the
-- MET-based estimate computed at write time. Stored (not derived on read)
-- so the value is stable even if the user's weight changes later.
alter table workouts
  add column if not exists intensity text check (
    intensity in ('light','moderate','vigorous')
  ),
  add column if not exists calories_burned int;
