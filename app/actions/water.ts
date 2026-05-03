"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addWater(amount_oz: number, log_date: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };
  if (!Number.isFinite(amount_oz) || amount_oz <= 0 || amount_oz > 256)
    return { error: "Invalid amount" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(log_date)) return { error: "Invalid date" };

  const { error } = await supabase.from("water_entries").insert({
    user_id: user.id,
    log_date,
    amount_oz: Math.round(amount_oz),
  });
  if (error) return { error: error.message };
  revalidatePath("/today");
  return { ok: true };
}

export async function deleteWater(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };
  const { error } = await supabase
    .from("water_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/today");
  return { ok: true };
}
