import { createClient } from "@/lib/supabase/server";
import type { FoodEntry, WaterEntry } from "@/types/database";

export type DayTotals = {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  water_oz: number;
};

export async function getDayTotals(userId: string, logDate: string): Promise<DayTotals> {
  const supabase = createClient();
  const [foods, waters] = await Promise.all([
    supabase
      .from("food_entries")
      .select("calories,protein,fat,carbs")
      .eq("user_id", userId)
      .eq("log_date", logDate),
    supabase
      .from("water_entries")
      .select("amount_oz")
      .eq("user_id", userId)
      .eq("log_date", logDate),
  ]);

  const totals: DayTotals = { calories: 0, protein: 0, fat: 0, carbs: 0, water_oz: 0 };
  for (const f of foods.data ?? []) {
    totals.calories += f.calories ?? 0;
    totals.protein += f.protein ?? 0;
    totals.fat += f.fat ?? 0;
    totals.carbs += f.carbs ?? 0;
  }
  for (const w of waters.data ?? []) totals.water_oz += w.amount_oz ?? 0;
  return totals;
}

export async function getFoodEntries(userId: string, logDate: string): Promise<FoodEntry[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("food_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("log_date", logDate)
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function getWaterEntries(userId: string, logDate: string): Promise<WaterEntry[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("water_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("log_date", logDate)
    .order("logged_at", { ascending: true });
  return data ?? [];
}
