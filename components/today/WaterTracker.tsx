"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { addWater, deleteWater } from "@/app/actions/water";
import { useToast } from "@/components/ui/toast";
import type { WaterEntry } from "@/types/database";

const PRESETS = [8, 16, 24];

export function WaterTracker({
  totalOz,
  targetOz,
  entries,
  logDate,
}: {
  totalOz: number;
  targetOz: number;
  entries: WaterEntry[];
  logDate: string;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = React.useTransition();
  const [customOpen, setCustomOpen] = React.useState(false);
  const [customAmt, setCustomAmt] = React.useState<number | "">("");
  const pct = targetOz > 0 ? Math.min(100, (totalOz / targetOz) * 100) : 0;

  function add(oz: number) {
    startTransition(async () => {
      const res = await addWater(oz, logDate);
      if (res.error) toast({ title: "Couldn't add", description: res.error, variant: "destructive" });
    });
  }

  function onCustomAdd() {
    const n = typeof customAmt === "number" ? customAmt : parseFloat(customAmt);
    if (!Number.isFinite(n) || n <= 0) return;
    add(n);
    setCustomAmt("");
    setCustomOpen(false);
  }

  function onDelete(id: string) {
    startTransition(async () => {
      await deleteWater(id);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-muted-foreground">Water</span>
        <span className="tabular-nums text-sm">
          <span className="font-semibold">{totalOz}</span>
          <span className="text-muted-foreground"> / {targetOz} oz</span>
        </span>
      </div>
      <Progress value={pct} indicatorClassName="bg-sky-500" />
      <div className="flex gap-2 flex-wrap">
        {PRESETS.map((oz) => (
          <Button
            key={oz}
            variant="secondary"
            size="sm"
            onClick={() => add(oz)}
            disabled={pending}
          >
            +{oz} oz
          </Button>
        ))}
        {!customOpen ? (
          <Button variant="outline" size="sm" onClick={() => setCustomOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Custom
          </Button>
        ) : (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              type="number"
              inputMode="numeric"
              className="h-9 w-20 rounded-md border bg-background px-2 text-sm"
              value={customAmt}
              onChange={(e) => setCustomAmt(e.target.value === "" ? "" : Number(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && onCustomAdd()}
            />
            <Button size="sm" onClick={onCustomAdd} disabled={pending}>
              Add
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCustomOpen(false)}>
              Cancel
            </Button>
          </div>
        )}
      </div>
      {entries.length > 0 && (
        <div className="flex gap-1.5 flex-wrap pt-1">
          {entries.map((e) => (
            <button
              key={e.id}
              onClick={() => onDelete(e.id)}
              title="Tap to remove"
              className="text-[11px] tabular-nums px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 hover:bg-destructive/10 hover:text-destructive"
            >
              +{e.amount_oz}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
