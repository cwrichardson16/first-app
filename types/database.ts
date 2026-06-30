// Hand-written until `supabase gen types typescript` is run.
// Regenerate with: supabase gen types typescript --project-id <id> > types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type UserSettingsRow = {
  user_id: string;
  display_name: string | null;
  calorie_target: number;
  protein_target: number;
  fat_target: number;
  carb_target: number;
  water_target_oz: number;
  step_target: number;
  sleep_target_hours: number;
  start_weight: number | null;
  goal_weight: number | null;
  weekly_loss_target: number | null;
  units: "imperial" | "metric";
  timezone: string;
  height_in: number | null;
  sex: "male" | "female" | "other" | null;
  birthdate: string | null;
  activity_level:
    | "sedentary"
    | "light"
    | "moderate"
    | "active"
    | "very_active"
    | null;
  created_at: string;
  updated_at: string;
};

type DailyLogRow = {
  id: string;
  user_id: string;
  log_date: string;
  weight: number | null;
  steps: number | null;
  sleep_hours: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type QuickMealRow = {
  id: string;
  user_id: string;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  emoji: string | null;
  sort_order: number | null;
  created_at: string;
};

type FoodEntryRow = {
  id: string;
  user_id: string;
  log_date: string;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  quick_meal_id: string | null;
  created_at: string;
};

type WaterEntryRow = {
  id: string;
  user_id: string;
  log_date: string;
  amount_oz: number;
  logged_at: string;
};

type WorkoutRow = {
  id: string;
  user_id: string;
  workout_date: string;
  name: string;
  notes: string | null;
  duration_minutes: number | null;
  intensity: "light" | "moderate" | "vigorous" | null;
  calories_burned: number | null;
  created_at: string;
};

type ExerciseSetRow = {
  id: string;
  workout_id: string;
  exercise_name: string;
  exercise_order: number;
  set_number: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  created_at: string;
};

type ProgressPhotoRow = {
  id: string;
  user_id: string;
  photo_date: string;
  storage_path: string;
  weight_at_time: number | null;
  pose: "front" | "side" | "back" | "other";
  notes: string | null;
  created_at: string;
};

type PartnerLinkRow = {
  user_id: string;
  partner_id: string;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      user_settings: {
        Row: UserSettingsRow;
        Insert: Partial<UserSettingsRow> & { user_id: string };
        Update: Partial<UserSettingsRow>;
        Relationships: [];
      };
      daily_logs: {
        Row: DailyLogRow;
        Insert: Partial<DailyLogRow> & { user_id: string; log_date: string };
        Update: Partial<DailyLogRow>;
        Relationships: [];
      };
      quick_meals: {
        Row: QuickMealRow;
        Insert: Partial<QuickMealRow> & {
          user_id: string;
          name: string;
          calories: number;
          protein: number;
          fat: number;
          carbs: number;
        };
        Update: Partial<QuickMealRow>;
        Relationships: [];
      };
      food_entries: {
        Row: FoodEntryRow;
        Insert: Partial<FoodEntryRow> & {
          user_id: string;
          log_date: string;
          name: string;
        };
        Update: Partial<FoodEntryRow>;
        Relationships: [];
      };
      water_entries: {
        Row: WaterEntryRow;
        Insert: Partial<WaterEntryRow> & {
          user_id: string;
          log_date: string;
          amount_oz: number;
        };
        Update: Partial<WaterEntryRow>;
        Relationships: [];
      };
      workouts: {
        Row: WorkoutRow;
        Insert: Partial<WorkoutRow> & {
          user_id: string;
          workout_date: string;
          name: string;
        };
        Update: Partial<WorkoutRow>;
        Relationships: [];
      };
      exercise_sets: {
        Row: ExerciseSetRow;
        Insert: Partial<ExerciseSetRow> & {
          workout_id: string;
          exercise_name: string;
          set_number: number;
        };
        Update: Partial<ExerciseSetRow>;
        Relationships: [];
      };
      progress_photos: {
        Row: ProgressPhotoRow;
        Insert: Partial<ProgressPhotoRow> & {
          user_id: string;
          photo_date: string;
          storage_path: string;
        };
        Update: Partial<ProgressPhotoRow>;
        Relationships: [];
      };
      partner_link: {
        Row: PartnerLinkRow;
        Insert: PartnerLinkRow;
        Update: Partial<PartnerLinkRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type UserSettings = UserSettingsRow;
export type DailyLog = DailyLogRow;
export type QuickMeal = QuickMealRow;
export type FoodEntry = FoodEntryRow;
export type WaterEntry = WaterEntryRow;
export type Workout = WorkoutRow;
export type ExerciseSet = ExerciseSetRow;
export type ProgressPhoto = ProgressPhotoRow;
export type PartnerLink = PartnerLinkRow;
