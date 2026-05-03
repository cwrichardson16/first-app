"use client";

import * as React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { format, parseISO } from "date-fns";

type Pt = { date: string; weight: number | null; avg7: number | null };

export function WeightChart({
  data,
  goalWeight,
}: {
  data: Pt[];
  goalWeight: number | null;
}) {
  const [range, setRange] = React.useState<7 | 30 | 90>(30);
  const slice = data.slice(-range);
  const points = slice.filter((p) => p.weight !== null || p.avg7 !== null);
  const ys = points
    .flatMap((p) => [p.weight, p.avg7])
    .filter((v): v is number => v !== null);
  if (goalWeight) ys.push(goalWeight);
  const yMin = ys.length ? Math.floor(Math.min(...ys) - 1) : 0;
  const yMax = ys.length ? Math.ceil(Math.max(...ys) + 1) : 200;

  return (
    <div>
      <div className="flex justify-end gap-1 mb-2">
        {([7, 30, 90] as const).map((n) => (
          <button
            key={n}
            onClick={() => setRange(n)}
            className={`text-xs px-2 py-1 rounded ${
              range === n ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {n}d
          </button>
        ))}
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={slice}>
            <XAxis
              dataKey="date"
              tickFormatter={(v) => format(parseISO(v), "M/d")}
              fontSize={11}
              stroke="hsl(var(--muted-foreground))"
              minTickGap={20}
            />
            <YAxis
              domain={[yMin, yMax]}
              fontSize={11}
              stroke="hsl(var(--muted-foreground))"
              width={32}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelFormatter={(v) => format(parseISO(String(v)), "EEE, MMM d")}
              formatter={(value: number | string, name) => {
                if (value === null || value === undefined) return ["—", name];
                return [Number(value).toFixed(1), name === "weight" ? "Weight" : "7d avg"];
              }}
            />
            {goalWeight && (
              <ReferenceLine
                y={goalWeight}
                stroke="hsl(var(--success))"
                strokeDasharray="4 4"
                label={{ value: "Goal", position: "right", fill: "hsl(var(--success))", fontSize: 11 }}
              />
            )}
            <Line
              type="monotone"
              dataKey="weight"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1}
              dot={{ r: 2.5, fill: "hsl(var(--primary))" }}
              connectNulls
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="avg7"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
