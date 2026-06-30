import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { UserSettings } from "@/types/database";
import { DEFAULT_TZ } from "@/lib/date";

export async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

export async function getSettings(): Promise<UserSettings> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (data) return data;

  // Trigger should have created the row, but be defensive.
  const fallback: UserSettings = {
    user_id: user.id,
    display_name: user.email?.split("@")[0] ?? null,
    calorie_target: 1950,
    protein_target: 200,
    fat_target: 65,
    carb_target: 150,
    water_target_oz: 128,
    step_target: 10000,
    sleep_target_hours: 8,
    start_weight: null,
    goal_weight: null,
    weekly_loss_target: 1.25,
    units: "imperial",
    timezone: DEFAULT_TZ,
    height_in: null,
    sex: null,
    birthdate: null,
    activity_level: "moderate",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await supabase.from("user_settings").insert({
    user_id: user.id,
    display_name: fallback.display_name,
  });
  return fallback;
}
