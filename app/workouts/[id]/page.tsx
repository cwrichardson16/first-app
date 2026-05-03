import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { WorkoutForm } from "@/components/workouts/WorkoutForm";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getWorkoutWithSets,
  getWorkoutNameSuggestions,
  getExerciseNameSuggestions,
} from "@/lib/workouts";

export const dynamic = "force-dynamic";

export default async function WorkoutDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const supabase = createClient();
  const workout = await getWorkoutWithSets(params.id, user.id);
  if (!workout) notFound();

  const [workoutNames, exerciseNames, { data: partner }] = await Promise.all([
    getWorkoutNameSuggestions(user.id),
    getExerciseNameSuggestions(user.id),
    supabase.from("partner_link").select("partner_id").eq("user_id", user.id).maybeSingle(),
  ]);

  return (
    <main className="container max-w-2xl pb-28 pt-4 space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link href="/workouts" aria-label="Back">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold truncate">{workout.name}</h1>
      </div>

      <WorkoutForm
        mode="edit"
        workoutId={workout.id}
        defaultDate={workout.workout_date}
        initial={{
          workout_date: workout.workout_date,
          name: workout.name,
          notes: workout.notes,
          duration_minutes: workout.duration_minutes,
          exercises: workout.exercises.map((e) => ({
            exercise_name: e.name,
            sets: e.sets.map((s) => ({ weight: s.weight, reps: s.reps, rpe: s.rpe })),
          })),
        }}
        workoutNameSuggestions={workoutNames}
        exerciseNameSuggestions={exerciseNames}
      />

      <BottomNav hasPartner={!!partner} />
    </main>
  );
}
