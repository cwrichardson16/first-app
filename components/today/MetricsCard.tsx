"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upsertDailyLog } from "@/app/actions/daily-log";
import { useToast } from "@/components/ui/toast";
import type { DailyLog } from "@/types/database";

export function MetricsCard({
  log,
  logDate,
  yesterdayWeight,
  sleepAvg7,
}: {
  log: DailyLog | null;
  logDate: string;
  yesterdayWeight: number | null;
  sleepAvg7: number | null;
}) {
  const { toast } = useToast();
  const [weight, setWeight] = React.useState<string>(log?.weight?.toString() ?? "");
  const [steps, setSteps] = React.useState<string>(log?.steps?.toString() ?? "");
  const [sleep, setSleep] = React.useState<string>(log?.sleep_hours?.toString() ?? "");
  const [pending, startTransition] = React.useTransition();
  const lastSaved = React.useRef({ weight, steps, sleep });

  // Debounced auto-save
  React.useEffect(() => {
    if (
      weight === lastSaved.current.weight &&
      steps === lastSaved.current.steps &&
      sleep === lastSaved.current.sleep
    ) {
      return;
    }
    const t = setTimeout(() => {
      const payload = {
        log_date: logDate,
        weight: weight === "" ? null : parseFloat(weight),
        steps: steps === "" ? null : parseInt(steps, 10),
        sleep_hours: sleep === "" ? null : parseFloat(sleep),
      };
      startTransition(async () => {
        const res = await upsertDailyLog(payload);
        if (res.error) {
          toast({ title: "Save failed", description: res.error, variant: "destructive" });
        } else {
          lastSaved.current = { weight, steps, sleep };
        }
      });
    }, 700);
    return () => clearTimeout(t);
  }, [weight, steps, sleep, logDate, toast]);

  return (
    <div className="grid grid-cols-3 gap-3">
      <Field label="Weight (lbs)">
        <Input
          type="number"
          inputMode="decimal"
          step="0.1"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder={yesterdayWeight ? yesterdayWeight.toFixed(1) : "—"}
        />
      </Field>
      <Field label="Steps">
        <Input
          type="number"
          inputMode="numeric"
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
          placeholder="—"
        />
      </Field>
      <Field label="Sleep (hrs)">
        <Input
          type="number"
          inputMode="decimal"
          step="0.1"
          value={sleep}
          onChange={(e) => setSleep(e.target.value)}
          placeholder={sleepAvg7 ? sleepAvg7.toFixed(1) : "—"}
        />
      </Field>
      {pending && (
        <p className="col-span-3 text-[11px] text-muted-foreground -mt-1">Saving…</p>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
