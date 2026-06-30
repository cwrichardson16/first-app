import { addDays, format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { dateRange, shiftDate } from "@/lib/date";
import { energyPicture } from "@/lib/body";
import type { UserSettings } from "@/types/database";

export type LoggingCheck =
  | {
      available: false;
      reason:
        | "no_tdee"
        | "not_enough_weights"
        | "not_enough_food_logs"
        | "no_recent_loss";
    }
  | {
      available: true;
      avgLoggedKcal: number;
      tdee: number;
      actualWeeklyLossLb: number;
      estimatedActualIntake: number;
      gapKcalPerDay: number; // estimatedActualIntake - avgLoggedKcal
    };

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
  workoutCaloriesThisWeek: number;
  workoutVolumeWeeks: { weekStart: string; volume: number }[];
  tdee: number | null;
  loggingCheck: LoggingCheck;
};

export async function getDashboardData(
  userId: string,
  endDate: string,
  settings: UserSettings,
): Promise<DashboardData> {
  const targets = {
    calorie_target: settings.calorie_target,
    protein_target: settings.protein_target,
    goal_weight: settings.goal_weight,
    start_weight: settings.start_weight,
  };
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
      .select("id, workout_date, calories_burned")
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

  // Projected goal date + actual weekly rate — needs ≥10 weights in last 30 days.
  // Regression uses true day offsets (not entry index) so the slope is lb/day,
  // which gives accurate projection AND a correct rate for the Reality Check.
  const recent30 = dateRange(endDate, 30)
    .map((d) => ({ d, w: weightByDate.get(d) }))
    .filter((x): x is { d: string; w: number } => x.w !== undefined);
  let projectedGoalDate: string | null = null;
  let projectedRate: number | null = null;
  if (recent30.length >= 10) {
    const firstMs = parseISO(recent30[0].d).getTime();
    const xs = recent30.map(
      (p) => (parseISO(p.d).getTime() - firstMs) / (1000 * 60 * 60 * 24),
    );
    const ys = recent30.map((p) => p.w);
    const n = xs.length;
    const sumX = xs.reduce((a, b) => a + b, 0);
    const sumY = ys.reduce((a, b) => a + b, 0);
    const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0);
    const sumX2 = xs.reduce((acc, x) => acc + x * x, 0);
    const denom = n * sumX2 - sumX * sumX;
    const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0; // lb/day
    if (slope < -0.005) {
      projectedRate = -slope * 7; // lb/wk loss
      if (targets.goal_weight) {
        const lastWeight = ys[ys.length - 1];
        const daysToGoal = (targets.goal_weight - lastWeight) / slope;
        if (Number.isFinite(daysToGoal) && daysToGoal > 0 && daysToGoal < 365 * 2) {
          projectedGoalDate = format(
            addDays(parseISO(recent30[recent30.length - 1].d), daysToGoal),
            "yyyy-MM-dd",
          );
        }
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
  const thisWeekWorkouts = (workouts ?? []).filter(
    (w) => w.workout_date >= thisWeekStart && w.workout_date <= endDate,
  );
  const workoutsThisWeek = thisWeekWorkouts.length;
  const workoutCaloriesThisWeek = thisWeekWorkouts.reduce(
    (sum, w) => sum + (w.calories_burned ?? 0),
    0,
  );

  // Energy picture (TDEE) for the dashboard. Uses the most recent weight in
  // the series; falls back to start_weight from settings.
  const latestWeight = [...weightSeries].reverse().find((p) => p.weight !== null);
  const currentWeightLb = latestWeight?.weight ?? settings.start_weight ?? null;
  const energy = energyPicture({
    currentWeightLb,
    heightIn: settings.height_in,
    sex: settings.sex,
    birthdate: settings.birthdate,
    activity: settings.activity_level,
    weeklyLossLb: settings.weekly_loss_target,
  });

  // "Reality check": compare what the logs say vs what the weight loss implies.
  // Only show when we have ALL of: a TDEE estimate, a real (negative) weight
  // trend over the last 30 days, AND consistent food logs over the last 14.
  // Counting only days with ≥500 kcal avoids skewing avg from snack-only logs.
  const fullLogDays = Array.from(calsByDate.entries()).filter(
    ([, v]) => v.calories >= 500,
  );
  const avgLoggedKcal =
    fullLogDays.length > 0
      ? fullLogDays.reduce((s, [, v]) => s + v.calories, 0) / fullLogDays.length
      : 0;

  let loggingCheck: LoggingCheck;
  if (!energy.tdee) {
    loggingCheck = { available: false, reason: "no_tdee" };
  } else if (projectedRate === null) {
    loggingCheck = { available: false, reason: "not_enough_weights" };
  } else if (fullLogDays.length < 7) {
    loggingCheck = { available: false, reason: "not_enough_food_logs" };
  } else if (projectedRate <= 0.05) {
    // Need actual weight loss (positive projectedRate) for the math to be meaningful.
    loggingCheck = { available: false, reason: "no_recent_loss" };
  } else {
    const actualDeficitPerDay = (projectedRate * 3500) / 7;
    const estimatedActualIntake = Math.round(energy.tdee - actualDeficitPerDay);
    const gap = Math.round(estimatedActualIntake - avgLoggedKcal);
    loggingCheck = {
      available: true,
      avgLoggedKcal: Math.round(avgLoggedKcal),
      tdee: energy.tdee,
      actualWeeklyLossLb: Math.round(projectedRate * 100) / 100,
      estimatedActualIntake,
      gapKcalPerDay: gap,
    };
  }

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
    workoutCaloriesThisWeek,
    workoutVolumeWeeks,
    tdee: energy.tdee,
    loggingCheck,
  };
}
