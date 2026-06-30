"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const optionalNumber = (min: number, max: number) =>
  z
    .union([z.coerce.number().min(min).max(max), z.literal(""), z.null()])
    .transform((v) => (v === "" || v === null ? null : v))
    .optional();

const optionalEnum = <T extends string>(values: readonly T[]) =>
  z
    .union([z.enum(values as readonly [T, ...T[]]), z.literal(""), z.null()])
    .transform((v) => (v === "" || v === null ? null : v))
    .optional();

const optionalDate = z
  .union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    z.literal(""),
    z.null(),
  ])
  .transform((v) => (v === "" || v === null ? null : v))
  .optional();

const settingsSchema = z.object({
  display_name: z.string().trim().min(1).max(60).optional(),
  calorie_target: z.coerce.number().int().min(500).max(10000).optional(),
  protein_target: z.coerce.number().int().min(0).max(1000).optional(),
  fat_target: z.coerce.number().int().min(0).max(500).optional(),
  carb_target: z.coerce.number().int().min(0).max(1000).optional(),
  water_target_oz: z.coerce.number().int().min(8).max(512).optional(),
  step_target: z.coerce.number().int().min(0).max(100000).optional(),
  sleep_target_hours: z.coerce.number().min(0).max(24).optional(),
  start_weight: z.coerce.number().min(50).max(700).nullable().optional(),
  goal_weight: z.coerce.number().min(50).max(700).nullable().optional(),
  weekly_loss_target: z.coerce.number().min(0).max(10).nullable().optional(),
  units: z.enum(["imperial", "metric"]).optional(),
  timezone: z
    .string()
    .min(1)
    .max(80)
    .refine(isValidTimeZone, { message: "Invalid timezone" })
    .optional(),
  height_in: optionalNumber(36, 96),
  sex: optionalEnum(["male", "female", "other"] as const),
  birthdate: optionalDate,
  activity_level: optionalEnum([
    "sedentary",
    "light",
    "moderate",
    "active",
    "very_active",
  ] as const),
});

export async function updateSettings(input: unknown) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { error } = await supabase
    .from("user_settings")
    .update(parsed.data)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/settings");
  revalidatePath("/today");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteAccount() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !url) {
    return { error: "Account deletion is not configured. Set SUPABASE_SERVICE_ROLE_KEY." };
  }

  // Delete user via admin API (cascades through FKs).
  const res = await fetch(`${url}/auth/v1/admin/users/${user.id}`, {
    method: "DELETE",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });
  if (!res.ok && res.status !== 404) {
    return { error: `Delete failed: ${res.status}` };
  }
  await supabase.auth.signOut();
  redirect("/login");
}
