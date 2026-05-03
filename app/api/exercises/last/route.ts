import { NextResponse, type NextRequest } from "next/server";
import { format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const name = request.nextUrl.searchParams.get("name");
  if (!name) return NextResponse.json({ sets: [] });

  // Find the most recent workout that contains this exercise
  const { data: workouts } = await supabase
    .from("workouts")
    .select("id, workout_date")
    .eq("user_id", user.id)
    .order("workout_date", { ascending: false })
    .limit(40);
  if (!workouts || workouts.length === 0) return NextResponse.json({ sets: [] });

  const ids = workouts.map((w) => w.id);
  const { data: setRows } = await supabase
    .from("exercise_sets")
    .select("workout_id, exercise_name, set_number, weight, reps")
    .in("workout_id", ids)
    .ilike("exercise_name", name)
    .order("set_number", { ascending: true });

  if (!setRows || setRows.length === 0) return NextResponse.json({ sets: [] });

  // Pick the most recent workout that has matching sets
  const workoutById = new Map(workouts.map((w) => [w.id, w.workout_date]));
  const grouped = new Map<string, typeof setRows>();
  for (const s of setRows) {
    const arr = grouped.get(s.workout_id) ?? [];
    arr.push(s);
    grouped.set(s.workout_id, arr);
  }
  let bestId: string | null = null;
  let bestDate = "";
  for (const [wid] of grouped) {
    const d = workoutById.get(wid) ?? "";
    if (d > bestDate) {
      bestDate = d;
      bestId = wid;
    }
  }
  if (!bestId) return NextResponse.json({ sets: [] });

  const sets = (grouped.get(bestId) ?? []).map((s) => ({ weight: s.weight, reps: s.reps }));
  return NextResponse.json({
    sets,
    when: bestDate ? format(parseISO(bestDate), "MMM d") : null,
  });
}
