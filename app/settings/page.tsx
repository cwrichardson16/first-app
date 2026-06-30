import { BottomNav } from "@/components/BottomNav";
import { TargetsForm } from "@/components/settings/TargetsForm";
import { QuickMealsManager } from "@/components/settings/QuickMealsManager";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { BodyForm } from "@/components/settings/BodyForm";
import { requireUser, getSettings } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const settings = await getSettings();
  const supabase = createClient();

  const [{ data: meals }, { data: partner }, { data: latestWeightRow }] = await Promise.all([
    supabase
      .from("quick_meals")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.from("partner_link").select("partner_id").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("daily_logs")
      .select("weight")
      .eq("user_id", user.id)
      .not("weight", "is", null)
      .order("log_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <main className="container max-w-2xl pb-28 pt-4 space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      <TargetsForm settings={settings} />
      <BodyForm settings={settings} currentWeightLb={latestWeightRow?.weight ?? null} />
      <QuickMealsManager meals={meals ?? []} />
      <ProfileForm settings={settings} />
      <BottomNav hasPartner={!!partner} />
    </main>
  );
}
