import Link from "next/link";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BottomNav } from "@/components/BottomNav";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { requireUser, getSettings } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCalendarMonth } from "@/lib/calendar";
import { getCalendarToday } from "@/lib/date";

export const dynamic = "force-dynamic";

function isValidMonth(s: string | undefined): s is string {
  return !!s && /^\d{4}-\d{2}$/.test(s);
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { m?: string };
}) {
  const user = await requireUser();
  const settings = await getSettings();
  const supabase = createClient();
  const today = getCalendarToday(settings.timezone);
  const currentMonth = format(new Date(today + "T00:00:00Z"), "yyyy-MM");
  const monthKey = isValidMonth(searchParams.m) ? searchParams.m : currentMonth;

  const [month, { data: partner }] = await Promise.all([
    getCalendarMonth(user.id, monthKey, {
      calorie_target: settings.calorie_target,
      protein_target: settings.protein_target,
    }),
    supabase.from("partner_link").select("partner_id").eq("user_id", user.id).maybeSingle(),
  ]);

  const isCurrent = monthKey >= currentMonth;
  const inMonthHits = month.cells
    .filter((c) => c.inMonth && c.date <= today)
    .reduce(
      (acc, day) => {
        if (day.weight !== null) acc.weight += 1;
        if (
          day.calories >= settings.calorie_target * 0.9 &&
          day.calories <= settings.calorie_target * 1.1
        )
          acc.calories += 1;
        if (day.protein >= settings.protein_target * 0.95 && day.calories > 0)
          acc.protein += 1;
        if (day.workoutCount > 0) acc.workouts += 1;
        acc.daysSoFar += 1;
        return acc;
      },
      { weight: 0, calories: 0, protein: 0, workouts: 0, daysSoFar: 0 },
    );

  return (
    <main className="container max-w-2xl pb-28 pt-4 space-y-4">
      <h1 className="text-2xl font-bold">Calendar</h1>

      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <Button asChild variant="ghost" size="icon" aria-label="Previous month">
              <Link href={`/calendar?m=${month.prev}`}>
                <ChevronLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="text-center">
              <p className="text-base font-semibold">{month.monthLabel}</p>
              {!isCurrent && (
                <Link
                  href="/calendar"
                  className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                >
                  Jump to this month
                </Link>
              )}
            </div>
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label="Next month"
              disabled={isCurrent}
              className={isCurrent ? "pointer-events-none opacity-30" : ""}
            >
              <Link href={isCurrent ? "#" : `/calendar?m=${month.next}`}>
                <ChevronRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>

          <CalendarGrid
            month={month}
            today={today}
            targets={{
              calorie_target: settings.calorie_target,
              protein_target: settings.protein_target,
            }}
          />
        </CardContent>
      </Card>

      {inMonthHits.daysSoFar > 0 && (
        <Card>
          <CardContent className="pt-4 grid grid-cols-4 gap-2 text-center">
            <Stat label="Weights" hits={inMonthHits.weight} total={inMonthHits.daysSoFar} />
            <Stat label="Calories" hits={inMonthHits.calories} total={inMonthHits.daysSoFar} />
            <Stat label="Protein" hits={inMonthHits.protein} total={inMonthHits.daysSoFar} />
            <Stat label="Workouts" hits={inMonthHits.workouts} total={inMonthHits.daysSoFar} />
          </CardContent>
        </Card>
      )}

      <BottomNav hasPartner={!!partner} />
    </main>
  );
}

function Stat({ label, hits, total }: { label: string; hits: number; total: number }) {
  const pct = total > 0 ? Math.round((hits / total) * 100) : 0;
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-lg font-semibold tabular-nums">
        {hits}
        <span className="text-xs text-muted-foreground">/{total}</span>
      </p>
      <p className="text-[10px] text-muted-foreground tabular-nums">{pct}%</p>
    </div>
  );
}
