import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMostRecentWorkoutByName } from "@/lib/workouts";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const name = request.nextUrl.searchParams.get("name");
  if (!name) return NextResponse.json({ exercises: [] });

  const result = await getMostRecentWorkoutByName(user.id, name);
  if (!result) return NextResponse.json({ exercises: [] });

  return NextResponse.json({
    exercises: result.exercises.map((ex) => ({
      exercise_name: ex.name,
      sets: ex.sets.map((s) => ({ weight: s.weight, reps: s.reps, rpe: null })),
    })),
  });
}
