"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { updateSettings } from "@/app/actions/settings";
import {
  energyPicture,
  ACTIVITY_LABELS,
  type ActivityLevel,
  type Sex,
} from "@/lib/body";
import type { UserSettings } from "@/types/database";

const ACTIVITY_OPTIONS = (
  Object.entries(ACTIVITY_LABELS) as [ActivityLevel, string][]
).map(([value, label]) => ({ value, label }));

type Props = {
  settings: UserSettings;
  currentWeightLb: number | null;
};

export function BodyForm({ settings, currentWeightLb }: Props) {
  const { toast } = useToast();
  const [pending, setPending] = React.useState(false);

  // Track form state so the BMR/TDEE preview reacts as the user edits.
  const [heightIn, setHeightIn] = React.useState<string>(
    settings.height_in?.toString() ?? "",
  );
  const [sex, setSex] = React.useState<Sex | "">(settings.sex ?? "");
  const [birthdate, setBirthdate] = React.useState<string>(settings.birthdate ?? "");
  const [activity, setActivity] = React.useState<ActivityLevel | "">(
    settings.activity_level ?? "",
  );

  const preview = energyPicture({
    currentWeightLb: currentWeightLb ?? settings.start_weight,
    heightIn: heightIn ? Number(heightIn) : null,
    sex: sex || null,
    birthdate: birthdate || null,
    activity: activity || null,
    weeklyLossLb: settings.weekly_loss_target,
  });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const res = await updateSettings({
      height_in: heightIn,
      sex,
      birthdate,
      activity_level: activity,
    });
    setPending(false);
    if (res.error)
      toast({ title: "Save failed", description: res.error, variant: "destructive" });
    else toast({ title: "Body profile saved" });
  }

  async function applySuggested() {
    if (preview.suggestedCalories === null) return;
    setPending(true);
    const res = await updateSettings({ calorie_target: preview.suggestedCalories });
    setPending(false);
    if (res.error)
      toast({ title: "Save failed", description: res.error, variant: "destructive" });
    else toast({ title: `Calorie target set to ${preview.suggestedCalories}` });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Body profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="height_in" className="text-xs text-muted-foreground">
                Height (in)
              </Label>
              <Input
                id="height_in"
                type="number"
                inputMode="decimal"
                step="0.25"
                value={heightIn}
                onChange={(e) => setHeightIn(e.target.value)}
                placeholder="70"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="birthdate" className="text-xs text-muted-foreground">
                Birthdate
              </Label>
              <Input
                id="birthdate"
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sex" className="text-xs text-muted-foreground">
              Sex (for BMR calc)
            </Label>
            <select
              id="sex"
              value={sex}
              onChange={(e) => setSex(e.target.value as Sex | "")}
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
            >
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="activity_level" className="text-xs text-muted-foreground">
              Activity level
            </Label>
            <select
              id="activity_level"
              value={activity}
              onChange={(e) => setActivity(e.target.value as ActivityLevel | "")}
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
            >
              <option value="">—</option>
              {ACTIVITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save body profile"}
          </Button>
        </form>

        {(preview.bmr || preview.bmi) && (
          <div className="mt-5 pt-4 border-t space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Live estimate
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Metric label="BMI" value={preview.bmi?.toFixed(1) ?? "—"} sub={preview.bmiCategory ?? ""} />
              <Metric label="BMR" value={preview.bmr ? `${preview.bmr}` : "—"} sub="kcal/day" />
              <Metric label="TDEE" value={preview.tdee ? `${preview.tdee}` : "—"} sub="kcal/day" />
            </div>
            {preview.suggestedCalories !== null && (
              <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                <p className="text-sm">
                  To lose{" "}
                  <span className="font-semibold tabular-nums">
                    {settings.weekly_loss_target} lb/week
                  </span>{" "}
                  eat{" "}
                  <span className="font-semibold tabular-nums">
                    {preview.suggestedCalories} kcal/day
                  </span>
                  .
                </p>
                {preview.suggestedCalories !== settings.calorie_target && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={applySuggested}
                    disabled={pending}
                  >
                    Apply to calorie target (currently {settings.calorie_target})
                  </Button>
                )}
              </div>
            )}
            {currentWeightLb === null && settings.start_weight === null && (
              <p className="text-[11px] text-muted-foreground">
                Log a weight (or set a start weight) to compute BMR.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-md border bg-card p-2 text-center">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}
