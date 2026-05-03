"use client";

import * as React from "react";
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
  const formRef = React.useRef<HTMLFormElement>(null);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add food</DialogTitle>
        </DialogHeader>
        <form ref={formRef} onSubmit={onSubmit} className="space-y-3">
          <input type="hidden" name="log_date" value={logDate} />
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required maxLength={100} placeholder="Chicken & rice" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="calories">Calories</Label>
              <Input
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
