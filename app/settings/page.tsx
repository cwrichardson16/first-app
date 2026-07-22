import { BottomNav } from "@/components/BottomNav";
import { TargetsForm } from "@/components/settings/TargetsForm";
import { QuickMealsManager } from "@/components/settings/QuickMealsManager";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { PartnerSection } from "@/components/settings/PartnerSection";
import { requireUser, getSettings } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const settings = await getSettings();
  const supabase = createClient();

  const [{ data: meals }, { data: partner }] = await Promise.all([
    supabase
      .from("quick_meals")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.from("partner_link").select("partner_id").eq("user_id", user.id).maybeSingle(),
  ]);

  // Fetch partner's display name if linked
  let partnerName: string | null = null;
  if (partner) {
    const { data: partnerSettings } = await supabase
      .from("user_settings")
      .select("display_name")
      .eq("user_id", partner.partner_id)
      .maybeSingle();
    partnerName = partnerSettings?.display_name ?? null;
  }

  return (
    <main className="container max-w-2xl pb-28 pt-4 space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      <TargetsForm settings={settings} />
      <QuickMealsManager meals={meals ?? []} />
      <PartnerSection hasPartner={!!partner} partnerName={partnerName} />
      <ProfileForm settings={settings} />
      <BottomNav hasPartner={!!partner} />
    </main>
  );
}
