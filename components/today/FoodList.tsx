"use client";

import * as React from "react";
import { Trash2, Pencil, Sparkles, Loader2 } from "lucide-react";
import { deleteFoodEntry, updateFoodEntry } from "@/app/actions/food";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import type { FoodEntry } from "@/types/database";

export function FoodList({ entries }: { entries: FoodEntry[] }) {
  const { toast } = useToast();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<FoodEntry | null>(null);
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
    <>
      <ul className="divide-y border rounded-lg overflow-hidden">
        {entries.map((e) => (
          <li key={e.id} className="flex items-center gap-3 p-3">
            <button
              className="flex-1 min-w-0 text-left"
              onClick={() => setEditing(e)}
            >
              <p className="font-medium truncate">{e.name}</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {e.calories} kcal · P{e.protein} F{e.fat} C{e.carbs}
              </p>
            </button>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Edit entry"
              onClick={() => setEditing(e)}
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
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

      {editing && (
        <EditFoodDialog
          entry={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function EditFoodDialog({
  entry,
  onClose,
}: {
  entry: FoodEntry;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [pending, setPending] = React.useState(false);
  const [estimating, setEstimating] = React.useState(false);
  const nameRef = React.useRef<HTMLInputElement>(null);
  const caloriesRef = React.useRef<HTMLInputElement>(null);
  const proteinRef = React.useRef<HTMLInputElement>(null);
  const fatRef = React.useRef<HTMLInputElement>(null);
  const carbsRef = React.useRef<HTMLInputElement>(null);

  async function estimateMacros() {
    const name = nameRef.current?.value?.trim();
    if (!name) return;
    setEstimating(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: name, mode: "food" }),
      });
      if (!res.ok) throw new Error("Estimation failed");
      const data = await res.json();
      if (data.name && nameRef.current) nameRef.current.value = data.name;
      if (caloriesRef.current) caloriesRef.current.value = String(data.calories ?? 0);
      if (proteinRef.current) proteinRef.current.value = String(data.protein ?? 0);
      if (fatRef.current) fatRef.current.value = String(data.fat ?? 0);
      if (carbsRef.current) carbsRef.current.value = String(data.carbs ?? 0);
    } catch {
      toast({ title: "Couldn't estimate", variant: "destructive" });
    } finally {
      setEstimating(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const res = await updateFoodEntry(entry.id, {
      name: nameRef.current?.value?.trim() ?? entry.name,
      calories: Number(caloriesRef.current?.value ?? entry.calories),
      protein: Number(proteinRef.current?.value ?? entry.protein),
      fat: Number(fatRef.current?.value ?? entry.fat),
      carbs: Number(carbsRef.current?.value ?? entry.carbs),
    });
    setPending(false);
    if (res?.error) {
      toast({ title: "Save failed", description: res.error, variant: "destructive" });
    } else {
      toast({ title: "Food updated" });
      onClose();
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit food</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Name</Label>
            <div className="flex gap-2">
              <Input
                ref={nameRef}
                id="edit-name"
                defaultValue={entry.name}
                required
                maxLength={100}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={estimateMacros}
                disabled={estimating}
                title="Re-estimate macros"
                className="shrink-0"
              >
                {estimating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Calories</Label>
              <Input ref={caloriesRef} type="number" inputMode="numeric" min={0} required defaultValue={entry.calories} />
            </div>
            <div className="space-y-1.5">
              <Label>Protein (g)</Label>
              <Input ref={proteinRef} type="number" inputMode="numeric" min={0} required defaultValue={entry.protein} />
            </div>
            <div className="space-y-1.5">
              <Label>Fat (g)</Label>
              <Input ref={fatRef} type="number" inputMode="numeric" min={0} required defaultValue={entry.fat} />
            </div>
            <div className="space-y-1.5">
              <Label>Carbs (g)</Label>
              <Input ref={carbsRef} type="number" inputMode="numeric" min={0} required defaultValue={entry.carbs} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
