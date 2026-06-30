import Link from "next/link";
import { format, parseISO } from "date-fns";
import type { CalendarMonth } from "@/lib/calendar";
import { computeHits } from "@/lib/calendar";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

type Props = {
  month: CalendarMonth;
  today: string;
  targets: { calorie_target: number; protein_target: number };
};

export function CalendarGrid({ month, today, targets }: Props) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-1 text-[10px] text-muted-foreground uppercase tracking-wider text-center">
        {DAY_LABELS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {month.cells.map((day) => (
          <DayCell key={day.date} day={day} today={today} targets={targets} />
        ))}
      </div>
      <Legend />
    </div>
  );
}

function DayCell({
  day,
  today,
  targets,
}: {
  day: Props["month"]["cells"][number];
  today: string;
  targets: Props["targets"];
}) {
  const isFuture = day.date > today;
  const isToday = day.date === today;
  const hits = computeHits(day, targets);
  const dayNum = format(parseISO(day.date), "d");

  const ringClass = isToday ? "ring-2 ring-primary" : "";
  const opacityClass = day.inMonth ? "" : "opacity-30";

  let bgClass = "";
  if (isFuture) {
    bgClass = "bg-muted/10";
  } else if (hits.count >= 3) {
    bgClass = "bg-emerald-500/15";
  } else if (hits.count === 2) {
    bgClass = "bg-emerald-500/5";
  } else if (!day.hasAnyData) {
    bgClass = "bg-muted/10";
  }

  const cellClasses = `block min-h-[58px] rounded-md p-1.5 border border-transparent ${ringClass} ${opacityClass} ${bgClass}`;

  if (isFuture) {
    return <div className={`${cellClasses} text-muted-foreground/60 text-xs tabular-nums`}>{dayNum}</div>;
  }

  return (
    <Link
      href={`/today?d=${day.date}`}
      className={`${cellClasses} hover:border-border transition-colors flex flex-col`}
      aria-label={`${format(parseISO(day.date), "EEEE, MMMM d")}: ${hits.count} of 4 hit`}
    >
      <span className="text-xs tabular-nums font-medium">{dayNum}</span>
      <div className="mt-auto flex gap-0.5">
        <Dot on={hits.weight} title="Weight" />
        <Dot on={hits.calories} title="Calories" />
        <Dot on={hits.protein} title="Protein" />
        <Dot on={hits.workout} title="Workout" />
      </div>
    </Link>
  );
}

function Dot({ on, title }: { on: boolean; title: string }) {
  return (
    <span
      title={title}
      className={`flex-1 h-1 rounded-sm ${
        on ? "bg-primary" : "bg-muted-foreground/20"
      }`}
    />
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground pt-2 border-t">
      <span className="flex items-center gap-1">
        <span className="h-1 w-3 rounded-sm bg-primary inline-block" /> Weight
      </span>
      <span className="flex items-center gap-1">
        <span className="h-1 w-3 rounded-sm bg-primary inline-block" /> Calories
      </span>
      <span className="flex items-center gap-1">
        <span className="h-1 w-3 rounded-sm bg-primary inline-block" /> Protein
      </span>
      <span className="flex items-center gap-1">
        <span className="h-1 w-3 rounded-sm bg-primary inline-block" /> Workout
      </span>
      <span className="ml-auto">Tap a day to view it</span>
    </div>
  );
}
