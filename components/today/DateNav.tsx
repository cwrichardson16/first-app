"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { longDate, shiftDate } from "@/lib/date";

export function DateNav({ logDate, calendarToday }: { logDate: string; calendarToday: string }) {
  const router = useRouter();
  const prev = shiftDate(logDate, -1);
  const next = shiftDate(logDate, 1);
  const isFuture = next > calendarToday;

  return (
    <div className="flex items-center justify-between gap-2">
      <Button asChild variant="ghost" size="icon" aria-label="Previous day">
        <Link href={`/today?d=${prev}`}>
          <ChevronLeft className="h-5 w-5" />
        </Link>
      </Button>
      <div className="text-center flex-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          {logDate === calendarToday ? "Today" : ""}
        </p>
        <input
          type="date"
          className="bg-transparent text-base font-medium text-center w-full focus:outline-none"
          value={logDate}
          max={calendarToday}
          onChange={(e) => {
            const v = e.target.value;
            if (v) router.push(`/today?d=${v}`);
          }}
          aria-label="Pick date"
        />
        <p className="text-xs text-muted-foreground">{longDate(logDate)}</p>
      </div>
      <Button
        asChild
        variant="ghost"
        size="icon"
        aria-label="Next day"
        disabled={isFuture}
        className={isFuture ? "pointer-events-none opacity-30" : ""}
      >
        <Link href={isFuture ? "#" : `/today?d=${next}`}>
          <ChevronRight className="h-5 w-5" />
        </Link>
      </Button>
    </div>
  );
}
