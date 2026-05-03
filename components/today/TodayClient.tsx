"use client";

import * as React from "react";
import { QuickAddRow } from "./QuickAddRow";
import { AddFoodDialog } from "./AddFoodDialog";
import type { QuickMeal } from "@/types/database";

export function TodayClient({
  meals,
  logDate,
}: {
  meals: QuickMeal[];
  logDate: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <QuickAddRow meals={meals} logDate={logDate} onAddCustom={() => setOpen(true)} />
      <AddFoodDialog open={open} onOpenChange={setOpen} logDate={logDate} />
    </>
  );
}
