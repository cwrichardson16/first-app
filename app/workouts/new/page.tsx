import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { WorkoutForm } from "@/components/workouts/WorkoutForm";
import { requireUser, getSettings } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLogicalToday } from "@/lib/date";
import { getWorkoutNameSuggestions, getExerciseNameSuggestions } from "@/lib/workouts";

export const dynamic = "force-dynamic";

export default async function NewWorkoutPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const user = await requireUser();
  const settings = await getSettings();
  const supabase = createClient();
  const defaultDate =
    searchParams.date && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date)
      ? searchParams.date
      : getLogicalToday(settings.timezone);

  const [
    workoutNames,
    exerciseNames,
    { data: partner },
    { data: latestWeightRow },
  ] = await Promise.all([
    getWorkoutNameSuggestions(user.id),
    getExerciseNameSuggestions(user.id),
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
  const currentWeightLb = latestWeightRow?.weight ?? settings.start_weight ?? null;

  return (
    <main className="container max-w-2xl pb-28 pt-4 space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link href="/workouts" aria-label="Back">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold">New workout</h1>
      </div>

      <WorkoutForm
        mode="create"
        defaultDate={defaultDate}
        workoutNameSuggestions={workoutNames}
        exerciseNameSuggestions={exerciseNames}
        currentWeightLb={currentWeightLb}
      />

      <BottomNav hasPartner={!!partner} />
    </main>
  );
}
