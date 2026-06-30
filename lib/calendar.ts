import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
} from "date-fns";
import { createClient } from "@/lib/supabase/server";

export type DayInfo = {
  date: string; // YYYY-MM-DD
  inMonth: boolean;
  weight: number | null;
  calories: number;
  protein: number;
  workoutCount: number;
  hasAnyData: boolean;
};

export type CalendarMonth = {
  monthKey: string; // YYYY-MM
  monthLabel: string;
  prev: string; // YYYY-MM
  next: string; // YYYY-MM
  cells: DayInfo[]; // padded to full weeks
};

function shiftMonth(yyyymm: string, by: number): string {
  const [y, m] = yyyymm.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return format(d, "yyyy-MM");
}

export async function getCalendarMonth(
  userId: string,
  yyyymm: string,
  targets: { calorie_target: number; protein_target: number },
): Promise<CalendarMonth> {
  const supabase = createClient();
  const monthStart = startOfMonth(new Date(yyyymm + "-01T00:00:00Z"));
  const monthEnd = endOfMonth(monthStart);
  // Pad to full weeks so the grid is rectangular.
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const gridStartIso = format(gridStart, "yyyy-MM-dd");
  const gridEndIso = format(gridEnd, "yyyy-MM-dd");

  const [{ data: logs }, { data: foods }, { data: workouts }] = await Promise.all([
    supabase
      .from("daily_logs")
      .select("log_date, weight")
      .eq("user_id", userId)
      .gte("log_date", gridStartIso)
      .lte("log_date", gridEndIso),
    supabase
      .from("food_entries")
      .select("log_date, calories, protein")
      .eq("user_id", userId)
      .gte("log_date", gridStartIso)
      .lte("log_date", gridEndIso),
    supabase
      .from("workouts")
      .select("workout_date")
      .eq("user_id", userId)
      .gte("workout_date", gridStartIso)
      .lte("workout_date", gridEndIso),
  ]);

  const weightByDate = new Map<string, number>();
  for (const l of logs ?? []) {
    if (l.weight !== null) weightByDate.set(l.log_date, l.weight);
  }

  const foodByDate = new Map<string, { calories: number; protein: number }>();
  for (const f of foods ?? []) {
    const cur = foodByDate.get(f.log_date) ?? { calories: 0, protein: 0 };
    cur.calories += f.calories ?? 0;
    cur.protein += f.protein ?? 0;
    foodByDate.set(f.log_date, cur);
  }

  const workoutCountByDate = new Map<string, number>();
  for (const w of workouts ?? []) {
    workoutCountByDate.set(w.workout_date, (workoutCountByDate.get(w.workout_date) ?? 0) + 1);
  }

  const monthStr = format(monthStart, "yyyy-MM");
  const cells: DayInfo[] = eachDayOfInterval({ start: gridStart, end: gridEnd }).map((d) => {
    const date = format(d, "yyyy-MM-dd");
    const inMonth = format(d, "yyyy-MM") === monthStr;
    const weight = weightByDate.get(date) ?? null;
    const food = foodByDate.get(date) ?? { calories: 0, protein: 0 };
    const workoutCount = workoutCountByDate.get(date) ?? 0;
    return {
      date,
      inMonth,
      weight,
      calories: food.calories,
      protein: food.protein,
      workoutCount,
      hasAnyData:
        weight !== null || food.calories > 0 || workoutCount > 0,
    };
  });

  return {
    monthKey: monthStr,
    monthLabel: format(monthStart, "MMMM yyyy"),
    prev: shiftMonth(monthStr, -1),
    next: shiftMonth(monthStr, 1),
    cells,
  };
}

// Indicator math broken out so the grid component can stay pure-presentational.
export type DayHits = {
  weight: boolean;
  calories: boolean;
  protein: boolean;
  workout: boolean;
  count: number;
};

export function computeHits(
  day: DayInfo,
  targets: { calorie_target: number; protein_target: number },
): DayHits {
  const calories =
    day.calories > 0 &&
    day.calories >= targets.calorie_target * 0.9 &&
    day.calories <= targets.calorie_target * 1.1;
  const protein = day.protein >= targets.protein_target * 0.95 && day.calories > 0;
  const weight = day.weight !== null;
  const workout = day.workoutCount > 0;
  const count = [weight, calories, protein, workout].filter(Boolean).length;
  return { weight, calories, protein, workout, count };
}
