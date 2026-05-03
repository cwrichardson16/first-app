"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";
import { format, parseISO } from "date-fns";

type Pt = { date: string; calories: number; target: number };

function colorFor(cal: number, target: number): string {
  if (cal === 0) return "hsl(var(--muted))";
  const diff = Math.abs(cal - target);
  if (diff <= 100) return "hsl(var(--success))";
  if (diff <= 300) return "hsl(var(--warning))";
  return "hsl(var(--destructive))";
}

export function CalorieBars({ data }: { data: Pt[] }) {
  const target = data[0]?.target ?? 2000;
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis
            dataKey="date"
            tickFormatter={(v) => format(parseISO(v), "M/d")}
            fontSize={11}
            stroke="hsl(var(--muted-foreground))"
            minTickGap={10}
          />
          <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" width={36} />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(v) => format(parseISO(String(v)), "EEE, MMM d")}
            formatter={(value: number) => [Math.round(value).toLocaleString(), "Calories"]}
          />
          <ReferenceLine y={target} stroke="hsl(var(--primary))" strokeDasharray="3 3" />
          <Bar dataKey="calories" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell key={i} fill={colorFor(d.calories, d.target)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
