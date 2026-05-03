"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { updateSettings } from "@/app/actions/settings";
import type { UserSettings } from "@/types/database";

export function TargetsForm({ settings }: { settings: UserSettings }) {
  const { toast } = useToast();
  const [pending, setPending] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const obj = Object.fromEntries(fd) as Record<string, string>;
    const payload: Record<string, unknown> = { ...obj };
    for (const k of ["start_weight", "goal_weight", "weekly_loss_target"]) {
      if (payload[k] === "") payload[k] = null;
    }
    const res = await updateSettings(payload);
    setPending(false);
    if (res.error) toast({ title: "Save failed", description: res.error, variant: "destructive" });
    else toast({ title: "Settings saved" });
  }

  return (
    <form onSubmit={onSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily targets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Grid>
            <Field id="calorie_target" label="Calories" defaultValue={settings.calorie_target} />
            <Field id="protein_target" label="Protein (g)" defaultValue={settings.protein_target} />
            <Field id="fat_target" label="Fat (g)" defaultValue={settings.fat_target} />
            <Field id="carb_target" label="Carbs (g)" defaultValue={settings.carb_target} />
            <Field id="water_target_oz" label="Water (oz)" defaultValue={settings.water_target_oz} />
            <Field id="step_target" label="Steps" defaultValue={settings.step_target} />
            <Field
              id="sleep_target_hours"
              label="Sleep (hrs)"
              defaultValue={settings.sleep_target_hours}
              step="0.1"
            />
          </Grid>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Goal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Grid>
            <Field
              id="start_weight"
              label="Start weight (lbs)"
              defaultValue={settings.start_weight ?? ""}
              step="0.1"
            />
            <Field
              id="goal_weight"
              label="Goal weight (lbs)"
              defaultValue={settings.goal_weight ?? ""}
              step="0.1"
            />
            <Field
              id="weekly_loss_target"
              label="Weekly loss (lbs)"
              defaultValue={settings.weekly_loss_target ?? ""}
              step="0.05"
            />
          </Grid>
        </CardContent>
      </Card>

      <div className="mt-4 flex justify-end">
        <Button type="submit" disabled={pending} size="lg">
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function Field({
  id,
  label,
  defaultValue,
  step,
}: {
  id: string;
  label: string;
  defaultValue: string | number;
  step?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        name={id}
        type="number"
        inputMode={step ? "decimal" : "numeric"}
        step={step ?? "1"}
        defaultValue={defaultValue}
      />
    </div>
  );
}
