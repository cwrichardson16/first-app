import { addDays, format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { dateRange, shiftDate } from "@/lib/date";

export type DashboardData = {
  weightSeries: { date: string; weight: number | null; avg7: number | null }[];
  goalWeight: number | null;
  startWeight: number | null;
  caloriesSeries: { date: string; calories: number; target: number }[];
  proteinHitRate: { hits: number; total: number };
  daysLogged: number;
  streak: number;
  longestStreak: number;
  projectedGoalDate: string | null;
  projectedRate: number | null;
  workoutsThisWeek: number;
  workoutVolumeWeeks: { weekStart: string; volume: number }[];
};

export async function getDashboardData(
  userId: string,
  endDate: string,
  targets: {
    calorie_target: number;
    protein_target: number;
    goal_weight: number | null;
    start_weight: number | null;
  },
): Promise<DashboardData> {
  const supabase = createClient();
  const since90 = shiftDate(endDate, -90);
  const since14 = shiftDate(endDate, -14);

  const [
    { data: logs },
    { data: foods },
    { data: workouts },
  ] = await Promise.all([
    supabase
      .from("daily_logs")
      .select("log_date, weight, sleep_hours, steps")
      .eq("user_id", userId)
      .gte("log_date", since90)
      .lte("log_date", endDate)
      .order("log_date", { ascending: true }),
    supabase
      .from("food_entries")
      .select("log_date, calories, protein")
      .eq("user_id", userId)
      .gte("log_date", since14)
      .lte("log_date", endDate),
    supabase
      .from("workouts")
      .select("id, workout_date")
      .eq("user_id", userId)
      .gte("workout_date", shiftDate(endDate, -28))
      .lte("workout_date", endDate),
  ]);

  // Weight series with 7-day rolling average
  const weightByDate = new Map<string, number>();
  for (const l of logs ?? []) if (l.weight !== null) weightByDate.set(l.log_date, l.weight);

  const weightSeries = dateRange(endDate, 90).map((d) => {
    const w = weightByDate.get(d) ?? null;
    // Build 7-day rolling avg from up to 7 most recent weights including this day
    const window: number[] = [];
    for (let i = 0; i < 7; i++) {
      const dd = format(addDays(parseISO(d), -i), "yyyy-MM-dd");
      const v = weightByDate.get(dd);
      if (v !== undefined) window.push(v);
    }
    const avg7 = window.length > 0 ? window.reduce((s, x) => s + x, 0) / window.length : null;
    return { date: d, weight: w, avg7 };
  });

  // Calorie compliance — last 14 days
  const calsByDate = new Map<string, { calories: number; protein: number }>();
  for (const f of foods ?? []) {
    const cur = calsByDate.get(f.log_date) ?? { calories: 0, protein: 0 };
    cur.calories += f.calories ?? 0;
    cur.protein += f.protein ?? 0;
    calsByDate.set(f.log_date, cur);
  }
  const caloriesSeries = dateRange(endDate, 14).map((d) => ({
    date: d,
    calories: calsByDate.get(d)?.calories ?? 0,
    target: targets.calorie_target,
  }));

  // Protein hit rate over 14 days where ≥1 food logged
  let proteinHits = 0;
  let proteinDays = 0;
  for (const d of dateRange(endDate, 14)) {
    const cur = calsByDate.get(d);
    if (cur && cur.calories > 0) {
      proteinDays += 1;
      if (cur.protein >= targets.protein_target * 0.95) proteinHits += 1;
    }
  }

  // Adherence — count days in last 90 with any data (food OR weight OR workout)
  const daysWithData = new Set<string>();
  for (const l of logs ?? []) {
    if (l.weight !== null || l.steps !== null || l.sleep_hours !== null) daysWithData.add(l.log_date);
  }
  for (const f of foods ?? []) daysWithData.add(f.log_date);
  for (const w of workouts ?? []) daysWithData.add(w.workout_date);

  const dl90 = dateRange(endDate, 90).filter((d) => daysWithData.has(d));
  const daysLogged = dl90.length;

  // Streak: consecutive days ending today (or yesterday)
  let streak = 0;
  for (let i = 0; i < 90; i++) {
    const d = shiftDate(endDate, -i);
    if (daysWithData.has(d)) streak += 1;
    else if (i === 0) continue; // allow today to be empty
    else break;
  }
  // Longest streak in window
  let longest = 0;
  let run = 0;
  for (const d of dateRange(endDate, 90)) {
    if (daysWithData.has(d)) {
      run += 1;
      longest = Math.max(longest, run);
    } else run = 0;
  }

  // Projected goal date — needs ≥10 weights in last 30 days
  const recent30 = dateRange(endDate, 30)
    .map((d) => ({ d, w: weightByDate.get(d) }))
    .filter((x): x is { d: string; w: number } => x.w !== undefined);
  let projectedGoalDate: string | null = null;
  let projectedRate: number | null = null;
  if (recent30.length >= 10 && targets.goal_weight) {
    // Linear regression on (dayIndex, weight)
    const xs = recent30.map((_, i) => i);
    const ys = recent30.map((x) => x.w);
    const n = xs.length;
    const sumX = xs.reduce((a, b) => a + b, 0);
    const sumY = ys.reduce((a, b) => a + b, 0);
    const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0);
    const sumX2 = xs.reduce((acc, x) => acc + x * x, 0);
    const denom = n * sumX2 - sumX * sumX;
    const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0; // lbs/day
    const lastWeight = ys[ys.length - 1];
    if (slope < -0.01) {
      const daysToGoal = (targets.goal_weight - lastWeight) / slope; // positive
      if (Number.isFinite(daysToGoal) && daysToGoal > 0 && daysToGoal < 365 * 2) {
        projectedGoalDate = format(
          addDays(parseISO(recent30[recent30.length - 1].d), daysToGoal),
          "yyyy-MM-dd",
        );
        projectedRate = -slope * 7;
      }
    }
  }

  // Workouts per week (4 weeks)
  const workoutVolumeWeeks: { weekStart: string; volume: number }[] = [];
  const ids = (workouts ?? []).map((w) => w.id);
  const setRows =
    ids.length > 0
      ? (
          await supabase
            .from("exercise_sets")
            .select("workout_id, weight, reps")
            .in("workout_id", ids)
        ).data ?? []
      : [];
  const volByWorkout = new Map<string, number>();
  for (const s of setRows) {
    if (s.weight && s.reps) {
      volByWorkout.set(s.workout_id, (volByWorkout.get(s.workout_id) ?? 0) + s.weight * s.reps);
    }
  }
  for (let i = 3; i >= 0; i--) {
    const ws = shiftDate(endDate, -7 * i - 6);
    const we = shiftDate(endDate, -7 * i);
    let vol = 0;
    for (const w of workouts ?? []) {
      if (w.workout_date >= ws && w.workout_date <= we) {
        vol += volByWorkout.get(w.id) ?? 0;
      }
    }
    workoutVolumeWeeks.push({ weekStart: ws, volume: Math.round(vol) });
  }
  const thisWeekStart = shiftDate(endDate, -6);
  const workoutsThisWeek = (workouts ?? []).filter(
    (w) => w.workout_date >= thisWeekStart && w.workout_date <= endDate,
  ).length;

  return {
    weightSeries,
    goalWeight: targets.goal_weight,
    startWeight: targets.start_weight,
    caloriesSeries,
    proteinHitRate: { hits: proteinHits, total: proteinDays },
    daysLogged,
    streak,
    longestStreak: longest,
    projectedGoalDate,
    projectedRate,
    workoutsThisWeek,
    workoutVolumeWeeks,
  };
}
