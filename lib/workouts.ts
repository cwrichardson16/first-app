import { createClient } from "@/lib/supabase/server";
import type { ExerciseSet, Workout } from "@/types/database";

export type WorkoutWithSets = Workout & {
  sets: ExerciseSet[];
  exercises: { name: string; order: number; sets: ExerciseSet[] }[];
  setCount: number;
  volume: number;
};

export function groupSetsByExercise(sets: ExerciseSet[]) {
  const map = new Map<number, { name: string; order: number; sets: ExerciseSet[] }>();
  for (const s of sets) {
    const existing = map.get(s.exercise_order);
    if (existing) {
      existing.sets.push(s);
    } else {
      map.set(s.exercise_order, { name: s.exercise_name, order: s.exercise_order, sets: [s] });
    }
  }
  return Array.from(map.values())
    .sort((a, b) => a.order - b.order)
    .map((ex) => ({
      ...ex,
      sets: ex.sets.sort((a, b) => a.set_number - b.set_number),
    }));
}

export function calcVolume(sets: ExerciseSet[]) {
  let v = 0;
  for (const s of sets) {
    if (s.weight && s.reps) v += s.weight * s.reps;
  }
  return v;
}

export async function getWorkoutWithSets(
  workoutId: string,
  userId: string,
): Promise<WorkoutWithSets | null> {
  const supabase = createClient();
  const { data: workout } = await supabase
    .from("workouts")
    .select("*")
    .eq("id", workoutId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!workout) return null;
  const { data: sets } = await supabase
    .from("exercise_sets")
    .select("*")
    .eq("workout_id", workoutId)
    .order("exercise_order", { ascending: true })
    .order("set_number", { ascending: true });

  const allSets = sets ?? [];
  return {
    ...workout,
    sets: allSets,
    exercises: groupSetsByExercise(allSets),
    setCount: allSets.length,
    volume: calcVolume(allSets),
  };
}

export async function getMostRecentWorkoutByName(userId: string, name: string) {
  const supabase = createClient();
  const { data: workout } = await supabase
    .from("workouts")
    .select("*")
    .eq("user_id", userId)
    .ilike("name", name)
    .order("workout_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!workout) return null;
  const { data: sets } = await supabase
    .from("exercise_sets")
    .select("*")
    .eq("workout_id", workout.id)
    .order("exercise_order", { ascending: true })
    .order("set_number", { ascending: true });
  return { workout, exercises: groupSetsByExercise(sets ?? []) };
}

export async function getRecentExerciseSets(userId: string, exerciseName: string, limit = 12) {
  const supabase = createClient();
  const { data: workouts } = await supabase
    .from("workouts")
    .select("id, workout_date")
    .eq("user_id", userId)
    .order("workout_date", { ascending: false })
    .limit(20);
  if (!workouts || workouts.length === 0) return [];
  const ids = workouts.map((w) => w.id);
  const { data: sets } = await supabase
    .from("exercise_sets")
    .select("*")
    .in("workout_id", ids)
    .ilike("exercise_name", exerciseName)
    .order("created_at", { ascending: false })
    .limit(limit);
  return sets ?? [];
}

export async function getWorkoutNameSuggestions(userId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("workouts")
    .select("name")
    .eq("user_id", userId)
    .order("workout_date", { ascending: false })
    .limit(50);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of data ?? []) {
    if (!seen.has(w.name)) {
      seen.add(w.name);
      out.push(w.name);
    }
  }
  return out;
}

export async function getExerciseNameSuggestions(userId: string) {
  const supabase = createClient();
  const { data: workouts } = await supabase
    .from("workouts")
    .select("id")
    .eq("user_id", userId)
    .order("workout_date", { ascending: false })
    .limit(40);
  if (!workouts || workouts.length === 0) return [];
  const { data } = await supabase
    .from("exercise_sets")
    .select("exercise_name")
    .in("workout_id", workouts.map((w) => w.id))
    .order("created_at", { ascending: false })
    .limit(500);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of data ?? []) {
    if (!seen.has(s.exercise_name)) {
      seen.add(s.exercise_name);
      out.push(s.exercise_name);
    }
  }
  return out;
}
