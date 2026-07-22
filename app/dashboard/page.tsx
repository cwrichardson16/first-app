import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BottomNav } from "@/components/BottomNav";
import { WeightChart } from "@/components/dashboard/WeightChart";
import { CalorieBars } from "@/components/dashboard/CalorieBars";
import { VolumeBars } from "@/components/dashboard/VolumeBars";
import { requireUser, getSettings } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCalendarToday } from "@/lib/date";
import { getDashboardData } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const settings = await getSettings();
  const today = getCalendarToday(settings.timezone);
  const data = await getDashboardData(user.id, today, {
    calorie_target: settings.calorie_target,
    protein_target: settings.protein_target,
    goal_weight: settings.goal_weight,
    start_weight: settings.start_weight,
  });

  const supabase = createClient();
  const { data: partner } = await supabase
    .from("partner_link")
    .select("partner_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const proteinPct =
    data.proteinHitRate.total > 0
      ? Math.round((data.proteinHitRate.hits / data.proteinHitRate.total) * 100)
      : null;

  return (
    <main className="container max-w-2xl pb-28 pt-4 space-y-4">
      <h1 className="text-2xl font-bold">Stats</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weight trend</CardTitle>
        </CardHeader>
        <CardContent>
          <WeightChart data={data.weightSeries} goalWeight={data.goalWeight} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Calorie compliance · last 14 days</CardTitle>
        </CardHeader>
        <CardContent>
          <CalorieBars data={data.caloriesSeries} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Stat
          label="Protein hit rate"
          value={
            proteinPct === null
              ? "—"
              : `${data.proteinHitRate.hits}/${data.proteinHitRate.total}`
          }
          sub={proteinPct === null ? "no data yet" : `${proteinPct}% in last 14 days`}
        />
        <Stat
          label="Days logged"
          value={`${data.daysLogged}`}
          sub="last 90 days"
        />
        <Stat label="Current streak" value={`${data.streak}d`} sub={`longest: ${data.longestStreak}d`} />
        <Stat
          label="Workouts this week"
          value={`${data.workoutsThisWeek}`}
          sub="target: 6"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Projected goal date</CardTitle>
        </CardHeader>
        <CardContent>
          {data.projectedGoalDate && data.projectedRate ? (
            <p className="text-sm">
              At your current pace (
              <span className="font-semibold tabular-nums">
                {data.projectedRate.toFixed(2)} {settings.units === "metric" ? "kg" : "lb"}/wk
              </span>
              ), you&apos;ll hit{" "}
              <span className="font-semibold tabular-nums">{data.goalWeight} {settings.units === "metric" ? "kg" : "lbs"}</span> around{" "}
              <span className="font-semibold">
                {format(parseISO(data.projectedGoalDate), "MMM d, yyyy")}
              </span>
              .
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Log at least 10 weights in the last 30 days for a projection.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workout volume · last 4 weeks</CardTitle>
        </CardHeader>
        <CardContent>
          <VolumeBars data={data.workoutVolumeWeeks} />
        </CardContent>
      </Card>

      {data.caloriesBurnedWeeks.some((w) => w.burned > 0) && (
        <div className="grid grid-cols-4 gap-2">
          {data.caloriesBurnedWeeks.map((w) => (
            <Card key={w.weekStart}>
              <CardContent className="p-3 text-center space-y-0.5">
                <p className="text-[10px] text-muted-foreground uppercase">
                  {format(parseISO(w.weekStart), "MMM d")}
                </p>
                <p className="text-lg font-semibold tabular-nums text-orange-400">
                  {w.burned.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground">cal burned</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <BottomNav hasPartner={!!partner} />
    </main>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-0.5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="text-[11px] text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}
