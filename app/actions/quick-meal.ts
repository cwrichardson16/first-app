"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const quickMealSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(60),
  emoji: z.string().max(8).optional().nullable(),
  calories: z.coerce.number().int().min(0).max(5000),
  protein: z.coerce.number().int().min(0).max(500),
  fat: z.coerce.number().int().min(0).max(500),
  carbs: z.coerce.number().int().min(0).max(500),
  sort_order: z.coerce.number().int().optional().nullable(),
});

export async function upsertQuickMeal(input: unknown) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = quickMealSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { id, ...rest } = parsed.data;
  if (id) {
    const { error } = await supabase
      .from("quick_meals")
      .update({ ...rest, emoji: rest.emoji ?? null })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("quick_meals").insert({
      user_id: user.id,
      ...rest,
      emoji: rest.emoji ?? null,
    });
    if (error) return { error: error.message };
  }

  revalidatePath("/today");
  revalidatePath("/settings");
  return { ok: true };
}

export async function deleteQuickMeal(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };
  const { error } = await supabase
    .from("quick_meals")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/today");
  revalidatePath("/settings");
  return { ok: true };
}
