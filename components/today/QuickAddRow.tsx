"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logQuickMeal } from "@/app/actions/food";
import { useToast } from "@/components/ui/toast";
import type { QuickMeal } from "@/types/database";

export function QuickAddRow({
  meals,
  logDate,
  onAddCustom,
}: {
  meals: QuickMeal[];
  logDate: string;
  onAddCustom: () => void;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = React.useTransition();
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  function logMeal(id: string, name: string) {
    setPendingId(id);
    startTransition(async () => {
      const res = await logQuickMeal(id, logDate);
      setPendingId(null);
      if (res.error) toast({ title: "Couldn't log", description: res.error, variant: "destructive" });
      else toast({ title: `Logged ${name}` });
    });
  }

  return (
    <div className="flex items-stretch gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
      {meals.map((m) => (
        <button
          key={m.id}
          onClick={() => logMeal(m.id, m.name)}
          disabled={pending && pendingId === m.id}
          className="snap-start shrink-0 flex flex-col items-center justify-center min-w-[88px] h-20 rounded-lg border bg-card px-3 text-center hover:bg-accent transition-colors disabled:opacity-50"
        >
          <span className="text-2xl leading-none">{m.emoji ?? "🍽"}</span>
          <span className="mt-1 text-xs font-medium line-clamp-2">{m.name}</span>
          <span className="text-[10px] text-muted-foreground tabular-nums">{m.calories} kcal</span>
        </button>
      ))}
      <Button
        onClick={onAddCustom}
        variant="outline"
        className="snap-start shrink-0 min-w-[88px] h-20 flex-col gap-1"
      >
        <Plus className="h-5 w-5" />
        <span className="text-xs font-medium">Add food</span>
      </Button>
    </div>
  );
}
