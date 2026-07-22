import { Flame } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requireUser, getSettings } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCalendarToday, prettyDate } from "@/lib/date";
import { getDayTotals } from "@/lib/queries";
import type { UserSettings } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function PartnerPage() {
  const me = await requireUser();
  const mySettings = await getSettings();
  const supabase = createClient();

  const { data: link } = await supabase
    .from("partner_link")
    .select("partner_id")
    .eq("user_id", me.id)
    .maybeSingle();

  if (!link) {
    return (
      <main className="container max-w-2xl pb-28 pt-4 space-y-4">
        <h1 className="text-2xl font-bold">Partner</h1>
        <Card>
          <CardContent className="pt-6 space-y-3 text-sm">
            <p className="font-medium">No partner linked yet.</p>
            <p className="text-muted-foreground">
              Go to Settings to generate an invite code or enter your partner&apos;s code.
            </p>
          </CardContent>
        </Card>
        <BottomNav hasPartner={false} />
      </main>
    );
  }

  const today = getCalendarToday(mySettings.timezone);

  // Fetch partner settings via direct query — RLS allows it because of partner_link
  // policy gating. But user_settings is self-only currently, so partner can't see
  // each other's settings. Targets shown for ME use my settings; for partner we
  // show with their settings if accessible, else fallback to mine.
  const { data: partnerSettingsRow } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", link.partner_id)
    .maybeSingle();

  // Fall back to schema defaults (NOT my targets — those would be misleading)
  const partnerSettings: UserSettings = partnerSettingsRow ?? {
    user_id: link.partner_id,
    display_name: "Partner",
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
    timezone: mySettings.timezone,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const [
    myTotals,
    partnerTotals,
    { data: myLog },
    { data: partnerLog },
    { data: myLastWorkout },
    { data: partnerLastWorkout },
    { data: myTodayWorkouts },
    { data: partnerTodayWorkouts },
  ] = await Promise.all([
    getDayTotals(me.id, today),
    getDayTotals(link.partner_id, today),
    supabase
      .from("daily_logs")
      .select("weight, steps, sleep_hours")
      .eq("user_id", me.id)
      .eq("log_date", today)
      .maybeSingle(),
    supabase
      .from("daily_logs")
      .select("weight, steps, sleep_hours")
      .eq("user_id", link.partner_id)
      .eq("log_date", today)
      .maybeSingle(),
    supabase
      .from("workouts")
      .select("name, workout_date")
      .eq("user_id", me.id)
      .order("workout_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("workouts")
      .select("name, workout_date")
      .eq("user_id", link.partner_id)
      .order("workout_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("workouts").select("id").eq("user_id", me.id).eq("workout_date", today),
    supabase.from("workouts").select("id").eq("user_id", link.partner_id).eq("workout_date", today),
  ]);

  // Sum calories burned for each
  async function sumCalsBurned(workoutIds: { id: string }[] | null) {
    if (!workoutIds || workoutIds.length === 0) return 0;
    const { data } = await supabase
      .from("exercise_sets")
      .select("calories_burned")
      .in("workout_id", workoutIds.map((w) => w.id))
      .not("calories_burned", "is", null);
    return (data ?? []).reduce((sum, s) => sum + (s.calories_burned ?? 0), 0);
  }
  const [myBurned, partnerBurned] = await Promise.all([
    sumCalsBurned(myTodayWorkouts),
    sumCalsBurned(partnerTodayWorkouts),
  ]);

  return (
    <main className="container max-w-3xl pb-28 pt-4 space-y-4">
      <h1 className="text-2xl font-bold">Partner</h1>
      <p className="text-xs text-muted-foreground">{prettyDate(today)}</p>

      <div className="grid sm:grid-cols-2 gap-4">
        <PartnerColumn
          name={mySettings.display_name ?? "You"}
          totals={myTotals}
          settings={mySettings}
          weight={myLog?.weight ?? null}
          steps={myLog?.steps ?? null}
          sleep={myLog?.sleep_hours ?? null}
          caloriesBurned={myBurned}
          lastWorkout={
            myLastWorkout
              ? { name: myLastWorkout.name, date: myLastWorkout.workout_date }
              : null
          }
        />
        <PartnerColumn
          name={partnerSettings.display_name ?? "Partner"}
          totals={partnerTotals}
          settings={partnerSettings}
          weight={partnerLog?.weight ?? null}
          steps={partnerLog?.steps ?? null}
          sleep={partnerLog?.sleep_hours ?? null}
          caloriesBurned={partnerBurned}
          lastWorkout={
            partnerLastWorkout
              ? { name: partnerLastWorkout.name, date: partnerLastWorkout.workout_date }
              : null
          }
        />
      </div>

      <BottomNav hasPartner={true} />
    </main>
  );
}

function PartnerColumn({
  name,
  totals,
  settings,
  weight,
  steps,
  sleep,
  caloriesBurned,
  lastWorkout,
}: {
  name: string;
  totals: { calories: number; protein: number; fat: number; carbs: number; water_oz: number };
  settings: UserSettings;
  weight: number | null;
  steps: number | null;
  sleep: number | null;
  caloriesBurned: number;
  lastWorkout: { name: string; date: string } | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Row label="Calories" value={totals.calories} target={settings.calorie_target} />
        {caloriesBurned > 0 && (
          <div className="flex items-center justify-between text-xs -mt-1">
            <span className="flex items-center gap-1 text-orange-400">
              <Flame className="h-3 w-3" /> {caloriesBurned} burned
            </span>
            <span className="text-muted-foreground tabular-nums">
              Net: {(totals.calories - caloriesBurned).toLocaleString()}
            </span>
          </div>
        )}
        <Row label="Protein" value={totals.protein} target={settings.protein_target} unit="g" />
        <Row label="Fat" value={totals.fat} target={settings.fat_target} unit="g" />
        <Row label="Carbs" value={totals.carbs} target={settings.carb_target} unit="g" />
        <Row
          label="Water"
          value={totals.water_oz}
          target={settings.water_target_oz}
          unit=" oz"
        />
        <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
          <Mini label="Weight" value={weight !== null ? `${weight} ${settings.units === "metric" ? "kg" : "lb"}` : "—"} />
          <Mini label="Steps" value={steps !== null ? steps.toLocaleString() : "—"} />
          <Mini label="Sleep" value={sleep !== null ? `${sleep}h` : "—"} />
        </div>
        <div className="text-xs pt-2 border-t">
          <p className="text-muted-foreground">Last workout</p>
          {lastWorkout ? (
            <p className="font-medium">
              {lastWorkout.name}{" "}
              <span className="text-muted-foreground tabular-nums">· {prettyDate(lastWorkout.date)}</span>
            </p>
          ) : (
            <p className="text-muted-foreground">None yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  target,
  unit = "",
}: {
  label: string;
  value: number;
  target: number;
  unit?: string;
}) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs tabular-nums">
        <span className="text-muted-foreground">{label}</span>
        <span>
          {value.toLocaleString()}
          {unit} / {target.toLocaleString()}
          {unit}
        </span>
      </div>
      <Progress value={pct} />
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-2 text-center">
      <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
      <p className="font-semibold tabular-nums">{value}</p>
    </div>
  );
}
