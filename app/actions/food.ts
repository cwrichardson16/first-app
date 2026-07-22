"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const foodSchema = z.object({
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().trim().min(1).max(100),
  calories: z.coerce.number().int().min(0).max(20000),
  protein: z.coerce.number().int().min(0).max(2000),
  fat: z.coerce.number().int().min(0).max(2000),
  carbs: z.coerce.number().int().min(0).max(2000),
  quick_meal_id: z.string().uuid().nullable().optional(),
  save_as_quick_meal: z.coerce.boolean().optional(),
  emoji: z.string().max(8).optional().nullable(),
});

export type FoodFormState = { error?: string; ok?: boolean };

export async function addFoodEntry(
  _prev: FoodFormState | null,
  formData: FormData,
): Promise<FoodFormState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = foodSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const data = parsed.data;
  const insertEntry = {
    user_id: user.id,
    log_date: data.log_date,
    name: data.name,
    calories: data.calories,
    protein: data.protein,
    fat: data.fat,
    carbs: data.carbs,
    quick_meal_id: data.quick_meal_id ?? null,
  };

  const { error } = await supabase.from("food_entries").insert(insertEntry);
  if (error) return { error: error.message };

  if (data.save_as_quick_meal) {
    await supabase.from("quick_meals").insert({
      user_id: user.id,
      name: data.name,
      calories: data.calories,
      protein: data.protein,
      fat: data.fat,
      carbs: data.carbs,
      emoji: data.emoji ?? null,
    });
  }

  revalidatePath("/today");
  return { ok: true };
}

export async function logQuickMeal(quickMealId: string, logDate: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { data: meal } = await supabase
    .from("quick_meals")
    .select("*")
    .eq("id", quickMealId)
    .eq("user_id", user.id)
    .single();
  if (!meal) return { error: "Quick meal not found" };

  const { error } = await supabase.from("food_entries").insert({
    user_id: user.id,
    log_date: logDate,
    name: meal.name,
    calories: meal.calories,
    protein: meal.protein,
    fat: meal.fat,
    carbs: meal.carbs,
    quick_meal_id: meal.id,
  });
  if (error) return { error: error.message };
  revalidatePath("/today");
  return { ok: true };
}

export async function updateFoodEntry(id: string, input: unknown): Promise<FoodFormState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = foodSchema.omit({ log_date: true, save_as_quick_meal: true, emoji: true, quick_meal_id: true }).safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { error } = await supabase
    .from("food_entries")
    .update({
      name: parsed.data.name,
      calories: parsed.data.calories,
      protein: parsed.data.protein,
      fat: parsed.data.fat,
      carbs: parsed.data.carbs,
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/today");
  return { ok: true };
}

export async function deleteFoodEntry(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase
    .from("food_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/today");
  return { ok: true };
}
