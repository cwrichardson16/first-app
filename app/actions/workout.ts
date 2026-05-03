"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const setSchema = z.object({
  weight: z
    .union([z.coerce.number(), z.literal("")])
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  reps: z
    .union([z.coerce.number().int(), z.literal("")])
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  rpe: z
    .union([z.coerce.number(), z.literal("")])
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
});

const exerciseSchema = z.object({
  exercise_name: z.string().trim().min(1).max(80),
  sets: z.array(setSchema).min(1),
});

const workoutSchema = z.object({
  workout_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().trim().min(1).max(60),
  notes: z.string().max(2000).optional().nullable(),
  duration_minutes: z.coerce.number().int().min(0).max(600).optional().nullable(),
  exercises: z.array(exerciseSchema).min(1),
});

export type WorkoutInput = z.infer<typeof workoutSchema>;

export async function createWorkout(input: unknown) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = workoutSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  const { data: workout, error: wErr } = await supabase
    .from("workouts")
    .insert({
      user_id: user.id,
      workout_date: data.workout_date,
      name: data.name,
      notes: data.notes ?? null,
      duration_minutes: data.duration_minutes ?? null,
    })
    .select("id")
    .single();
  if (wErr || !workout) return { error: wErr?.message ?? "Failed to create workout" };

  const sets = data.exercises.flatMap((ex, exIdx) =>
    ex.sets.map((s, setIdx) => ({
      workout_id: workout.id,
      exercise_name: ex.exercise_name,
      exercise_order: exIdx,
      set_number: setIdx + 1,
      weight: s.weight,
      reps: s.reps,
      rpe: s.rpe ?? null,
    })),
  );
  if (sets.length > 0) {
    const { error: sErr } = await supabase.from("exercise_sets").insert(sets);
    if (sErr) return { error: sErr.message };
  }

  revalidatePath("/workouts");
  revalidatePath("/today");
  revalidatePath("/dashboard");
  redirect(`/workouts/${workout.id}`);
}

export async function updateWorkout(workoutId: string, input: unknown) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = workoutSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  const { error: wErr } = await supabase
    .from("workouts")
    .update({
      workout_date: data.workout_date,
      name: data.name,
      notes: data.notes ?? null,
      duration_minutes: data.duration_minutes ?? null,
    })
    .eq("id", workoutId)
    .eq("user_id", user.id);
  if (wErr) return { error: wErr.message };

  await supabase.from("exercise_sets").delete().eq("workout_id", workoutId);

  const sets = data.exercises.flatMap((ex, exIdx) =>
    ex.sets.map((s, setIdx) => ({
      workout_id: workoutId,
      exercise_name: ex.exercise_name,
      exercise_order: exIdx,
      set_number: setIdx + 1,
      weight: s.weight,
      reps: s.reps,
      rpe: s.rpe ?? null,
    })),
  );
  if (sets.length > 0) {
    const { error: sErr } = await supabase.from("exercise_sets").insert(sets);
    if (sErr) return { error: sErr.message };
  }

  revalidatePath("/workouts");
  revalidatePath(`/workouts/${workoutId}`);
  revalidatePath("/today");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteWorkout(workoutId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };
  const { error } = await supabase
    .from("workouts")
    .delete()
    .eq("id", workoutId)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/workouts");
  revalidatePath("/today");
  redirect("/workouts");
}
