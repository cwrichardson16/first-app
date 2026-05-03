"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const dailyLogSchema = z.object({
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weight: z.coerce.number().min(50).max(700).nullable().optional(),
  steps: z.coerce.number().int().min(0).max(200000).nullable().optional(),
  sleep_hours: z.coerce.number().min(0).max(24).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function upsertDailyLog(input: {
  log_date: string;
  weight?: number | null;
  steps?: number | null;
  sleep_hours?: number | null;
  notes?: string | null;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = dailyLogSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { error } = await supabase.from("daily_logs").upsert(
    {
      user_id: user.id,
      log_date: parsed.data.log_date,
      weight: parsed.data.weight ?? null,
      steps: parsed.data.steps ?? null,
      sleep_hours: parsed.data.sleep_hours ?? null,
      notes: parsed.data.notes ?? null,
    },
    { onConflict: "user_id,log_date" },
  );
  if (error) return { error: error.message };
  revalidatePath("/today");
  revalidatePath("/dashboard");
  return { ok: true };
}
