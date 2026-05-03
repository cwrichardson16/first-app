"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const UUID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const STORAGE_PATH_RE = /^[a-f0-9-]{36}\/[a-f0-9-]{36}\.jpg$/;

const photoSchema = z.object({
  photo_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  storage_path: z.string().regex(STORAGE_PATH_RE, "Invalid storage path"),
  pose: z.enum(["front", "side", "back", "other"]).default("front"),
  weight_at_time: z.coerce.number().min(50).max(700).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function recordPhoto(input: unknown) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = photoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  const [folder] = data.storage_path.split("/");
  if (!UUID_RE.test(folder) || folder !== user.id) {
    return { error: "Invalid storage path" };
  }

  const { error } = await supabase.from("progress_photos").insert({
    user_id: user.id,
    photo_date: data.photo_date,
    storage_path: data.storage_path,
    pose: data.pose,
    weight_at_time: data.weight_at_time ?? null,
    notes: data.notes ?? null,
  });
  if (error) return { error: error.message };

  revalidatePath("/photos");
  return { ok: true };
}

export async function deletePhoto(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { data: photo } = await supabase
    .from("progress_photos")
    .select("storage_path, user_id")
    .eq("id", id)
    .single();
  if (!photo || photo.user_id !== user.id) return { error: "Not found" };

  await supabase.storage.from("progress-photos").remove([photo.storage_path]);
  const { error } = await supabase
    .from("progress_photos")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/photos");
  return { ok: true };
}
