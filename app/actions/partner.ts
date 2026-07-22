"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// Generate a random 8-character alphanumeric code
function randomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function generateInviteCode(): Promise<{ code: string } | { error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  // Check if user already has a partner
  const { data: existing } = await supabase
    .from("partner_link")
    .select("partner_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) return { error: "You already have a partner linked." };

  const code = randomCode();

  const { error } = await supabase.from("partner_invites").insert({
    user_id: user.id,
    code,
  });

  if (error) return { error: error.message };

  return { code };
}

const redeemSchema = z.object({
  code: z.string().trim().min(1, "Code is required").max(20),
});

export async function redeemInviteCode(
  code: string,
): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = redeemSchema.safeParse({ code });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const cleanCode = parsed.data.code;

  // Check if redeemer already has a partner
  const { data: existingLink } = await supabase
    .from("partner_link")
    .select("partner_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingLink) return { error: "You already have a partner linked." };

  // Look up the invite code
  const { data: invite, error: lookupErr } = await supabase
    .from("partner_invites")
    .select("*")
    .eq("code", cleanCode)
    .maybeSingle();

  if (lookupErr) return { error: lookupErr.message };
  if (!invite) return { error: "Invalid invite code." };

  // Validate: not used
  if (invite.used_by) return { error: "This code has already been used." };

  // Validate: not expired
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return { error: "This invite code has expired." };
  }

  // Validate: not self-invite
  if (invite.user_id === user.id) {
    return { error: "You cannot use your own invite code." };
  }

  // Check if the inviter already has a partner
  const { data: inviterLink } = await supabase
    .from("partner_link")
    .select("partner_id")
    .eq("user_id", invite.user_id)
    .maybeSingle();

  if (inviterLink) return { error: "The person who created this code already has a partner." };

  // Create both partner_link rows (bidirectional)
  const { error: linkErr } = await supabase.from("partner_link").insert([
    { user_id: user.id, partner_id: invite.user_id },
    { user_id: invite.user_id, partner_id: user.id },
  ]);

  if (linkErr) return { error: linkErr.message };

  // Mark invite as used
  await supabase
    .from("partner_invites")
    .update({ used_by: user.id, used_at: new Date().toISOString() })
    .eq("id", invite.id);

  revalidatePath("/settings");
  revalidatePath("/partner");
  revalidatePath("/today");
  revalidatePath("/dashboard");

  return { ok: true };
}

export async function unlinkPartner(): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  // Find existing link to confirm it exists
  const { data: link } = await supabase
    .from("partner_link")
    .select("partner_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!link) return { error: "No partner linked." };

  // Delete both directions
  const { error: delErr1 } = await supabase
    .from("partner_link")
    .delete()
    .eq("user_id", user.id)
    .eq("partner_id", link.partner_id);

  const { error: delErr2 } = await supabase
    .from("partner_link")
    .delete()
    .eq("user_id", link.partner_id)
    .eq("partner_id", user.id);

  if (delErr1 || delErr2) return { error: (delErr1 ?? delErr2)!.message };

  revalidatePath("/settings");
  revalidatePath("/partner");
  revalidatePath("/today");
  revalidatePath("/dashboard");

  return { ok: true };
}
