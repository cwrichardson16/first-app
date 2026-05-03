"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { deleteFoodEntry } from "@/app/actions/food";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { FoodEntry } from "@/types/database";

export function FoodList({ entries }: { entries: FoodEntry[] }) {
  const { toast } = useToast();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();

  if (entries.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-6 border border-dashed rounded-lg">
        Nothing logged yet.
      </div>
    );
  }

  function onDelete(id: string) {
    setPendingId(id);
    startTransition(async () => {
      const res = await deleteFoodEntry(id);
      setPendingId(null);
      if (res.error) toast({ title: "Couldn't delete", description: res.error, variant: "destructive" });
    });
  }

  return (
    <ul className="divide-y border rounded-lg overflow-hidden">
      {entries.map((e) => (
        <li key={e.id} className="flex items-center gap-3 p-3">
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{e.name}</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {e.calories} kcal · P{e.protein} F{e.fat} C{e.carbs}
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Delete entry"
            onClick={() => onDelete(e.id)}
            disabled={pendingId === e.id}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
