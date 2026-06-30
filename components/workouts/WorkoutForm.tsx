"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { createWorkout, updateWorkout, deleteWorkout } from "@/app/actions/workout";

type SetDraft = { weight: string; reps: string; rpe: string };
type ExerciseDraft = { exercise_name: string; sets: SetDraft[] };

type Intensity = "light" | "moderate" | "vigorous";

export type WorkoutFormProps = {
  mode: "create" | "edit";
  workoutId?: string;
  initial?: {
    workout_date: string;
    name: string;
    notes: string | null;
    duration_minutes: number | null;
    intensity: Intensity | null;
    exercises: { exercise_name: string; sets: { weight: number | null; reps: number | null; rpe: number | null }[] }[];
  };
  defaultDate: string;
  workoutNameSuggestions: string[];
  exerciseNameSuggestions: string[];
};

export function WorkoutForm(props: WorkoutFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = React.useState(false);
  const [date, setDate] = React.useState(props.initial?.workout_date ?? props.defaultDate);
  const [name, setName] = React.useState(props.initial?.name ?? "");
  const [duration, setDuration] = React.useState(
    props.initial?.duration_minutes ? String(props.initial.duration_minutes) : "",
  );
  const [intensity, setIntensity] = React.useState<Intensity | "">(
    props.initial?.intensity ?? "",
  );
  const [notes, setNotes] = React.useState(props.initial?.notes ?? "");
  const [exercises, setExercises] = React.useState<ExerciseDraft[]>(
    props.initial?.exercises.length
      ? props.initial.exercises.map((e) => ({
          exercise_name: e.exercise_name,
          sets: e.sets.map((s) => ({
            weight: s.weight?.toString() ?? "",
            reps: s.reps?.toString() ?? "",
            rpe: s.rpe?.toString() ?? "",
          })),
        }))
      : [{ exercise_name: "", sets: [{ weight: "", reps: "", rpe: "" }] }],
  );

  const updateExercise = (idx: number, patch: Partial<ExerciseDraft>) =>
    setExercises((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)));

  const updateSet = (exIdx: number, setIdx: number, patch: Partial<SetDraft>) =>
    setExercises((prev) =>
      prev.map((e, i) =>
        i === exIdx
          ? { ...e, sets: e.sets.map((s, j) => (j === setIdx ? { ...s, ...patch } : s)) }
          : e,
      ),
    );

  const addSet = (exIdx: number) =>
    setExercises((prev) =>
      prev.map((e, i) => {
        if (i !== exIdx) return e;
        const last = e.sets[e.sets.length - 1] ?? { weight: "", reps: "", rpe: "" };
        return { ...e, sets: [...e.sets, { ...last, rpe: "" }] };
      }),
    );

  const removeSet = (exIdx: number, setIdx: number) =>
    setExercises((prev) =>
      prev.map((e, i) =>
        i === exIdx ? { ...e, sets: e.sets.filter((_, j) => j !== setIdx) } : e,
      ),
    );

  const addExercise = () =>
    setExercises((prev) => [
      ...prev,
      { exercise_name: "", sets: [{ weight: "", reps: "", rpe: "" }] },
    ]);

  const removeExercise = (idx: number) =>
    setExercises((prev) => prev.filter((_, i) => i !== idx));

  async function loadRepeatLast() {
    if (!name.trim()) return;
    setPending(true);
    try {
      const res = await fetch(`/api/workouts/repeat-last?name=${encodeURIComponent(name)}`);
      const data = (await res.json()) as {
        exercises?: {
          exercise_name: string;
          sets: { weight: number | null; reps: number | null; rpe: number | null }[];
        }[];
      };
      if (!data.exercises || data.exercises.length === 0) {
        toast({ title: "No previous workout found", description: name });
        return;
      }
      setExercises(
        data.exercises.map((e) => ({
          exercise_name: e.exercise_name,
          sets: e.sets.map((s) => ({
            weight: s.weight?.toString() ?? "",
            reps: s.reps?.toString() ?? "",
            rpe: "",
          })),
        })),
      );
      toast({ title: `Loaded last "${name}"` });
    } finally {
      setPending(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Workout name required", variant: "destructive" });
      return;
    }
    const cleanExercises = exercises
      .filter((ex) => ex.exercise_name.trim())
      .map((ex) => ({
        exercise_name: ex.exercise_name.trim(),
        sets: ex.sets
          .filter((s) => s.weight !== "" || s.reps !== "")
          .map((s) => ({
            weight: s.weight === "" ? "" : Number(s.weight),
            reps: s.reps === "" ? "" : Number(s.reps),
            rpe: s.rpe === "" ? "" : Number(s.rpe),
          })),
      }))
      .filter((ex) => ex.sets.length > 0);

    if (cleanExercises.length === 0) {
      toast({ title: "Add at least one set", variant: "destructive" });
      return;
    }

    const payload = {
      workout_date: date,
      name: name.trim(),
      notes: notes.trim() || null,
      duration_minutes: duration ? parseInt(duration, 10) : null,
      intensity: intensity || null,
      exercises: cleanExercises,
    };

    setPending(true);
    const res =
      props.mode === "edit" && props.workoutId
        ? await updateWorkout(props.workoutId, payload)
        : await createWorkout(payload);
    setPending(false);

    if (res && "error" in res && res.error) {
      toast({ title: "Save failed", description: res.error, variant: "destructive" });
      return;
    }
    if (props.mode === "edit") {
      toast({ title: "Workout saved" });
      router.refresh();
    }
  }

  async function onDelete() {
    if (!props.workoutId) return;
    if (!confirm("Delete this workout?")) return;
    setPending(true);
    const res = await deleteWorkout(props.workoutId);
    setPending(false);
    if (res && "error" in res && res.error) {
      toast({ title: "Delete failed", description: res.error, variant: "destructive" });
    }
  }

  const showRepeat =
    props.mode === "create" &&
    name.trim().length >= 2 &&
    props.workoutNameSuggestions.some(
      (s) => s.toLowerCase() === name.trim().toLowerCase(),
    );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Card>
        <CardContent className="pt-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="duration">Duration (min)</Label>
              <Input
                id="duration"
                type="number"
                inputMode="numeric"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="60"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Intensity</Label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { v: "light", l: "Light", h: "Easy / circuit" },
                  { v: "moderate", l: "Moderate", h: "Standard lifting" },
                  { v: "vigorous", l: "Vigorous", h: "Heavy / intense" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setIntensity(intensity === opt.v ? "" : opt.v)}
                  className={`rounded-md border px-2 py-2 text-left transition-colors ${
                    intensity === opt.v
                      ? "border-primary bg-primary/10"
                      : "border-input"
                  }`}
                >
                  <div className="text-sm font-medium">{opt.l}</div>
                  <div className="text-[10px] text-muted-foreground leading-tight">
                    {opt.h}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Used with duration + your weight to estimate calories burned.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name">Workout name</Label>
            <Input
              id="name"
              list="workout-name-options"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Upper Push"
              required
            />
            <datalist id="workout-name-options">
              {props.workoutNameSuggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            {showRepeat && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={loadRepeatLast}
                disabled={pending}
                className="mt-1"
              >
                <Copy className="h-3.5 w-3.5 mr-1" /> Repeat last "{name}"
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {exercises.map((ex, exIdx) => (
        <ExerciseBlock
          key={exIdx}
          exercise={ex}
          allSuggestions={props.exerciseNameSuggestions}
          canRemove={exercises.length > 1}
          onChange={(patch) => updateExercise(exIdx, patch)}
          onSetChange={(setIdx, patch) => updateSet(exIdx, setIdx, patch)}
          onAddSet={() => addSet(exIdx)}
          onRemoveSet={(setIdx) => removeSet(exIdx, setIdx)}
          onRemove={() => removeExercise(exIdx)}
        />
      ))}

      <Button type="button" variant="outline" onClick={addExercise} className="w-full">
        <Plus className="h-4 w-4 mr-1" /> Add exercise
      </Button>

      <Card>
        <CardContent className="pt-5 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 sticky bottom-20 sm:static bg-background/80 backdrop-blur p-2 -mx-2 rounded-md">
        <Button type="submit" disabled={pending} className="flex-1" size="lg">
          {pending ? "Saving…" : props.mode === "edit" ? "Save changes" : "Save workout"}
        </Button>
        {props.mode === "edit" && (
          <Button type="button" variant="destructive" size="lg" onClick={onDelete} disabled={pending}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </form>
  );
}

function ExerciseBlock({
  exercise,
  allSuggestions,
  canRemove,
  onChange,
  onSetChange,
  onAddSet,
  onRemoveSet,
  onRemove,
}: {
  exercise: ExerciseDraft;
  allSuggestions: string[];
  canRemove: boolean;
  onChange: (patch: Partial<ExerciseDraft>) => void;
  onSetChange: (setIdx: number, patch: Partial<SetDraft>) => void;
  onAddSet: () => void;
  onRemoveSet: (setIdx: number) => void;
  onRemove: () => void;
}) {
  const [hint, setHint] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    if (!exercise.exercise_name.trim()) {
      setHint(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/exercises/last?name=${encodeURIComponent(exercise.exercise_name)}`,
        );
        const data = (await res.json()) as {
          sets?: { weight: number | null; reps: number | null }[];
          when?: string;
        };
        if (cancelled) return;
        if (data.sets && data.sets.length > 0) {
          const summary = data.sets
            .map((s) => `${s.weight ?? "—"}×${s.reps ?? "—"}`)
            .join(", ");
          setHint(`Last time: ${summary}${data.when ? ` (${data.when})` : ""}`);
        } else {
          setHint(null);
        }
      } catch {
        setHint(null);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [exercise.exercise_name]);

  return (
    <Card>
      <CardContent className="pt-5 space-y-3">
        <div className="flex items-start gap-2">
          <div className="flex-1 space-y-1">
            <Input
              list="exercise-name-options"
              value={exercise.exercise_name}
              onChange={(e) => onChange({ exercise_name: e.target.value })}
              placeholder="Exercise name (e.g. Bench Press)"
            />
            {hint && <p className="text-[11px] text-muted-foreground tabular-nums">{hint}</p>}
          </div>
          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remove exercise"
              onClick={onRemove}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
        <datalist id="exercise-name-options">
          {allSuggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>

        <div className="space-y-1.5">
          <div className="grid grid-cols-[28px_1fr_1fr_72px_36px] gap-1.5 text-[11px] text-muted-foreground px-1">
            <span>#</span>
            <span>Weight</span>
            <span>Reps</span>
            <span>RPE</span>
            <span></span>
          </div>
          {exercise.sets.map((s, idx) => (
            <div
              key={idx}
              className="grid grid-cols-[28px_1fr_1fr_72px_36px] items-center gap-1.5"
            >
              <span className="text-sm tabular-nums text-muted-foreground text-center">
                {idx + 1}
              </span>
              <Input
                type="number"
                inputMode="decimal"
                step="0.5"
                value={s.weight}
                onChange={(e) => onSetChange(idx, { weight: e.target.value })}
                placeholder="lbs"
                className="h-10 text-base"
              />
              <Input
                type="number"
                inputMode="numeric"
                value={s.reps}
                onChange={(e) => onSetChange(idx, { reps: e.target.value })}
                placeholder="reps"
                className="h-10 text-base"
              />
              <Input
                type="number"
                inputMode="decimal"
                step="0.5"
                value={s.rpe}
                onChange={(e) => onSetChange(idx, { rpe: e.target.value })}
                placeholder="—"
                className="h-10 text-base"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => onRemoveSet(idx)}
                disabled={exercise.sets.length <= 1}
                aria-label="Remove set"
                className="h-10 w-10"
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onAddSet}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add set
        </Button>
      </CardContent>
    </Card>
  );
}
