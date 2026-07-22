import { BottomNav } from "@/components/BottomNav";
import { UploadButton } from "@/components/photos/UploadButton";
import { PhotoGrid, type PhotoItem } from "@/components/photos/PhotoGrid";
import { requireUser, getSettings } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLogicalToday } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function PhotosPage() {
  const user = await requireUser();
  const settings = await getSettings();
  const supabase = createClient();
  const today = getLogicalToday(settings.timezone);

  const [{ data: photos }, { data: todayLog }, { data: partner }] = await Promise.all([
    supabase
      .from("progress_photos")
      .select("*")
      .eq("user_id", user.id)
      .order("photo_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("daily_logs")
      .select("weight")
      .eq("user_id", user.id)
      .eq("log_date", today)
      .maybeSingle(),
    supabase.from("partner_link").select("partner_id").eq("user_id", user.id).maybeSingle(),
  ]);

  const items: PhotoItem[] = await Promise.all(
    (photos ?? []).map(async (p) => {
      const { data: signed } = await supabase.storage
        .from("progress-photos")
        .createSignedUrl(p.storage_path, 60 * 60 * 8);
      return {
        id: p.id,
        photo_date: p.photo_date,
        pose: p.pose,
        weight_at_time: p.weight_at_time,
        notes: p.notes,
        url: signed?.signedUrl ?? "",
      };
    }),
  );

  return (
    <main className="container max-w-2xl pb-28 pt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Photos</h1>
        <UploadButton defaultDate={today} defaultWeight={todayLog?.weight ?? null} />
      </div>

      <PhotoGrid photos={items} />

      <BottomNav hasPartner={!!partner} />
    </main>
  );
}
