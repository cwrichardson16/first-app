import Link from "next/link";
import { Dumbbell, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BottomNav } from "@/components/BottomNav";
import { MacroBars } from "@/components/MacroBars";
import { DateNav } from "@/components/today/DateNav";
import { TodayClient } from "@/components/today/TodayClient";
import { FoodList } from "@/components/today/FoodList";
import { WaterTracker } from "@/components/today/WaterTracker";
import { MetricsCard } from "@/components/today/MetricsCard";
import { NotesField } from "@/components/today/NotesField";

import { requireUser, getSettings } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCalendarToday, getLogicalToday, shiftDate } from "@/lib/date";
import { getDayTotals, getFoodEntries, getWaterEntries } from "@/lib/queries";

export const dynamic = "force-dynamic";

function isValidDate(s: string | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams: { d?: string };
}) {
  const user = await requireUser();
  const settings = await getSettings();
  const tz = settings.timezone;
  const calendarToday = getCalendarToday(tz);
  const logicalToday = getLogicalToday(tz);
  const logDate = isValidDate(searchParams.d) ? searchParams.d : logicalToday;

  const supabase = createClient();

  const [
    { data: log },
    { data: meals },
    foodEntries,
    waterEntries,
    totals,
    { data: yesterdayLog },
    { data: sleepRows },
    { data: workoutToday },
    { data: todayWorkoutIds },
    { data: partner },
  ] = await Promise.all([
    supabase
      .from("daily_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("log_date", logDate)
      .maybeSingle(),
    supabase
      .from("quick_meals")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    getFoodEntries(user.id, logDate),
    getWaterEntries(user.id, logDate),
    getDayTotals(user.id, logDate),
    supabase
      .from("daily_logs")
      .select("weight")
      .eq("user_id", user.id)
      .eq("log_date", shiftDate(logDate, -1))
      .maybeSingle(),
    supabase
      .from("daily_logs")
      .select("sleep_hours")
      .eq("user_id", user.id)
      .gte("log_date", shiftDate(logDate, -7))
      .lt("log_date", logDate)
      .not("sleep_hours", "is", null),
    supabase
      .from("workouts")
      .select("id, name")
      .eq("user_id", user.id)
      .eq("workout_date", logDate)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("workouts")
      .select("id")
      .eq("user_id", user.id)
      .eq("workout_date", logDate),
    supabase.from("partner_link").select("partner_id").eq("user_id", user.id).maybeSingle(),
  ]);

  const sleepAvg7 =
    sleepRows && sleepRows.length > 0
      ? sleepRows.reduce((s, r) => s + (r.sleep_hours ?? 0), 0) / sleepRows.length
      : null;

  // Sum calories burned from today's workouts
  let caloriesBurned = 0;
  if (todayWorkoutIds && todayWorkoutIds.length > 0) {
    const { data: burnedSets } = await supabase
      .from("exercise_sets")
      .select("calories_burned")
      .in("workout_id", todayWorkoutIds.map((w) => w.id))
      .not("calories_burned", "is", null);
    caloriesBurned = (burnedSets ?? []).reduce((sum, s) => sum + (s.calories_burned ?? 0), 0);
  }

  return (
    <main className="container max-w-2xl pb-28 pt-4 space-y-5">
      <DateNav logDate={logDate} calendarToday={calendarToday} />

      <Card>
        <CardContent className="pt-5">
          <MacroBars
            calories={totals.calories}
            protein={totals.protein}
            fat={totals.fat}
            carbs={totals.carbs}
            targets={settings}
            caloriesBurned={caloriesBurned}
          />
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
          Quick add
        </h2>
        <TodayClient meals={meals ?? []} logDate={logDate} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
          Today's food
        </h2>
        <FoodList entries={foodEntries} />
      </section>

      <Card>
        <CardContent className="pt-5">
          <WaterTracker
            totalOz={totals.water_oz}
            targetOz={settings.water_target_oz}
            entries={waterEntries}
            logDate={logDate}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <MetricsCard
            log={log ?? null}
            logDate={logDate}
            yesterdayWeight={yesterdayLog?.weight ?? null}
            sleepAvg7={sleepAvg7}
            units={settings.units}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            Workout
          </CardTitle>
          {caloriesBurned > 0 && (
            <span className="flex items-center gap-1 text-sm text-orange-400 tabular-nums">
              <Flame className="h-3.5 w-3.5" />
              {caloriesBurned} cal burned
            </span>
          )}
        </CardHeader>
        <CardContent>
          {workoutToday ? (
            <Link
              href={`/workouts/${workoutToday.id}`}
              className="block rounded-lg border p-3 hover:bg-accent"
            >
              <p className="font-medium">{workoutToday.name}</p>
              <p className="text-xs text-muted-foreground">Tap to view</p>
            </Link>
          ) : (
            <Button asChild className="w-full" size="lg">
              <Link href={`/workouts/new?date=${logDate}`}>Log Workout</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
          Notes
        </h2>
        <NotesField initial={log?.notes ?? null} logDate={logDate} />
      </section>

      <Separator className="opacity-0" />

      <BottomNav hasPartner={!!partner} />
    </main>
  );
}
