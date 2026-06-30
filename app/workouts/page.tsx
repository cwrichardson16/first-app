import Link from "next/link";
import { Plus, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BottomNav } from "@/components/BottomNav";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { calcVolume, groupSetsByExercise } from "@/lib/workouts";
import { prettyDate } from "@/lib/date";
import { startOfWeek, format, parseISO } from "date-fns";
import type { ExerciseSet } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function WorkoutsPage() {
  const user = await requireUser();
  const supabase = createClient();

  const { data: workouts } = await supabase
    .from("workouts")
    .select("*")
    .eq("user_id", user.id)
    .order("workout_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(80);

  const ids = (workouts ?? []).map((w) => w.id);
  const { data: sets } =
    ids.length > 0
      ? await supabase.from("exercise_sets").select("*").in("workout_id", ids)
      : { data: [] as ExerciseSet[] };
  const setsByWorkout = new Map<string, ExerciseSet[]>();
  for (const s of sets ?? []) {
    const arr = setsByWorkout.get(s.workout_id) ?? [];
    arr.push(s);
    setsByWorkout.set(s.workout_id, arr);
  }

  const { data: partner } = await supabase
    .from("partner_link")
    .select("partner_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const groups = groupByWeek(workouts ?? []);

  return (
    <main className="container max-w-2xl pb-28 pt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Workouts</h1>
        <Button asChild>
          <Link href="/workouts/new">
            <Plus className="h-4 w-4 mr-1" /> New
          </Link>
        </Button>
      </div>

      {(!workouts || workouts.length === 0) && (
        <Card>
          <CardContent className="pt-6 text-center space-y-3">
            <Dumbbell className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">No workouts logged yet.</p>
            <Button asChild>
              <Link href="/workouts/new">Log your first workout</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {groups.map(([weekStart, items]) => (
        <section key={weekStart} className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Week of {format(parseISO(weekStart), "MMM d")}
          </h2>
          <ul className="divide-y rounded-lg border bg-card">
            {items.map((w) => {
              const ws = setsByWorkout.get(w.id) ?? [];
              const exCount = groupSetsByExercise(ws).length;
              return (
                <li key={w.id}>
                  <Link
                    href={`/workouts/${w.id}`}
                    className="flex items-center justify-between gap-3 p-3 hover:bg-accent transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{w.name}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {prettyDate(w.workout_date)} · {exCount} ex · {ws.length} sets
                        {w.calories_burned ? ` · ${w.calories_burned} kcal` : ""}
                      </p>
                    </div>
                    <p className="text-xs tabular-nums text-muted-foreground shrink-0">
                      {Math.round(calcVolume(ws)).toLocaleString()} vol
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <BottomNav hasPartner={!!partner} />
    </main>
  );
}

function groupByWeek<T extends { workout_date: string }>(items: T[]): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const it of items) {
    const ws = format(startOfWeek(parseISO(it.workout_date), { weekStartsOn: 1 }), "yyyy-MM-dd");
    const arr = map.get(ws) ?? [];
    arr.push(it);
    map.set(ws, arr);
  }
  return Array.from(map.entries()).sort(([a], [b]) => (a < b ? 1 : -1));
}
