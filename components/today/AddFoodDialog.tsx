"use client";

import * as React from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addFoodEntry } from "@/app/actions/food";
import { useToast } from "@/components/ui/toast";

export function AddFoodDialog({
  open,
  onOpenChange,
  logDate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  logDate: string;
}) {
  const { toast } = useToast();
  const [pending, setPending] = React.useState(false);
  const [estimating, setEstimating] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  const nameRef = React.useRef<HTMLInputElement>(null);
  const caloriesRef = React.useRef<HTMLInputElement>(null);
  const proteinRef = React.useRef<HTMLInputElement>(null);
  const fatRef = React.useRef<HTMLInputElement>(null);
  const carbsRef = React.useRef<HTMLInputElement>(null);

  async function estimateMacros() {
    const name = nameRef.current?.value?.trim();
    if (!name) {
      toast({ title: "Type what you ate first", variant: "destructive" });
      return;
    }
    setEstimating(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: name, mode: "food" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Estimation failed");
      }
      const data = await res.json();
      if (data.name && nameRef.current) nameRef.current.value = data.name;
      if (caloriesRef.current) caloriesRef.current.value = String(data.calories ?? 0);
      if (proteinRef.current) proteinRef.current.value = String(data.protein ?? 0);
      if (fatRef.current) fatRef.current.value = String(data.fat ?? 0);
      if (carbsRef.current) carbsRef.current.value = String(data.carbs ?? 0);
      toast({ title: "Macros estimated" });
    } catch (err) {
      toast({
        title: "Couldn't estimate",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setEstimating(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const formData = new FormData(e.currentTarget);
    const res = await addFoodEntry(null, formData);
    setPending(false);
    if (res?.error) {
      toast({ title: "Couldn't add", description: res.error, variant: "destructive" });
    } else {
      toast({ title: "Food logged" });
      formRef.current?.reset();
      onOpenChange(false);
    }
  }

  function handleNameKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      estimateMacros();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add food</DialogTitle>
        </DialogHeader>
        <form ref={formRef} onSubmit={onSubmit} className="space-y-3">
          <input type="hidden" name="log_date" value={logDate} />
          <div className="space-y-1.5">
            <Label htmlFor="name">What did you eat?</Label>
            <div className="flex gap-2">
              <Input
                ref={nameRef}
                id="name"
                name="name"
                required
                maxLength={100}
                placeholder="e.g. Chipotle bowl with chicken"
                onKeyDown={handleNameKeyDown}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={estimateMacros}
                disabled={estimating}
                title="Estimate macros with AI"
                className="shrink-0"
              >
                {estimating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Type a food &amp; hit <Sparkles className="inline h-3 w-3" /> or Enter to estimate macros
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="calories">Calories</Label>
              <Input
                ref={caloriesRef}
                id="calories"
                name="calories"
                type="number"
                inputMode="numeric"
                min={0}
                required
                defaultValue={0}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="protein">Protein (g)</Label>
              <Input
                ref={proteinRef}
                id="protein"
                name="protein"
                type="number"
                inputMode="numeric"
                min={0}
                required
                defaultValue={0}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fat">Fat (g)</Label>
              <Input
                ref={fatRef}
                id="fat"
                name="fat"
                type="number"
                inputMode="numeric"
                min={0}
                required
                defaultValue={0}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="carbs">Carbs (g)</Label>
              <Input
                ref={carbsRef}
                id="carbs"
                name="carbs"
                type="number"
                inputMode="numeric"
                min={0}
                required
                defaultValue={0}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              id="save_as_quick_meal"
              name="save_as_quick_meal"
              type="checkbox"
              value="true"
              className="h-4 w-4 accent-primary"
            />
            <Label htmlFor="save_as_quick_meal" className="cursor-pointer text-sm font-normal">
              Save as quick-meal preset
            </Label>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="emoji" className="text-xs text-muted-foreground">
              Emoji (optional, used if saving as quick-meal)
            </Label>
            <Input id="emoji" name="emoji" maxLength={4} placeholder="🍗" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Adding…" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
