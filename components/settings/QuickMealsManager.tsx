"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { upsertQuickMeal, deleteQuickMeal } from "@/app/actions/quick-meal";
import type { QuickMeal } from "@/types/database";

export function QuickMealsManager({ meals }: { meals: QuickMeal[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = React.useState<QuickMeal | null>(null);
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  function startNew() {
    setEditing(null);
    setOpen(true);
  }
  function startEdit(m: QuickMeal) {
    setEditing(m);
    setOpen(true);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const payload = { ...(editing?.id ? { id: editing.id } : {}), ...fd };
    const res = await upsertQuickMeal(payload);
    setPending(false);
    if (res.error) {
      toast({ title: "Save failed", description: res.error, variant: "destructive" });
    } else {
      toast({ title: editing ? "Quick meal updated" : "Quick meal added" });
      setOpen(false);
      router.refresh();
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this quick meal?")) return;
    const res = await deleteQuickMeal(id);
    if (res.error) toast({ title: "Delete failed", description: res.error, variant: "destructive" });
    else router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Quick meals</CardTitle>
        <Button size="sm" onClick={startNew}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </CardHeader>
      <CardContent>
        {meals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No quick meals yet. Add presets you eat often for one-tap logging.
          </p>
        ) : (
          <ul className="divide-y border rounded-lg">
            {meals.map((m) => (
              <li key={m.id} className="flex items-center gap-3 p-3">
                <span className="text-2xl">{m.emoji ?? "🍽"}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{m.name}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {m.calories} kcal · P{m.protein} F{m.fat} C{m.carbs}
                  </p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => startEdit(m)} aria-label="Edit">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onDelete(m.id)}
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit quick meal" : "New quick meal"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="grid grid-cols-[80px_1fr] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="emoji" className="text-xs text-muted-foreground">
                  Emoji
                </Label>
                <Input
                  id="emoji"
                  name="emoji"
                  defaultValue={editing?.emoji ?? ""}
                  maxLength={4}
                  placeholder="🥣"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs text-muted-foreground">
                  Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editing?.name ?? ""}
                  required
                  maxLength={60}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField id="calories" label="Calories" defaultValue={editing?.calories ?? 0} />
              <NumField id="protein" label="Protein (g)" defaultValue={editing?.protein ?? 0} />
              <NumField id="fat" label="Fat (g)" defaultValue={editing?.fat ?? 0} />
              <NumField id="carbs" label="Carbs (g)" defaultValue={editing?.carbs ?? 0} />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function NumField({
  id,
  label,
  defaultValue,
}: {
  id: string;
  label: string;
  defaultValue: number;
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
        inputMode="numeric"
        min={0}
        defaultValue={defaultValue}
        required
      />
    </div>
  );
}
