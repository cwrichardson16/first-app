"use client";

import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import { upsertDailyLog } from "@/app/actions/daily-log";

export function NotesField({
  initial,
  logDate,
}: {
  initial: string | null;
  logDate: string;
}) {
  const [value, setValue] = React.useState(initial ?? "");
  const last = React.useRef(value);

  React.useEffect(() => {
    if (value === last.current) return;
    const t = setTimeout(async () => {
      await upsertDailyLog({ log_date: logDate, notes: value });
      last.current = value;
    }, 800);
    return () => clearTimeout(t);
  }, [value, logDate]);

  return (
    <Textarea
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder="Notes for today (energy, hunger, anything)"
      rows={3}
      maxLength={2000}
    />
  );
}
