"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { format, parseISO } from "date-fns";

export function VolumeBars({ data }: { data: { weekStart: string; volume: number }[] }) {
  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis
            dataKey="weekStart"
            tickFormatter={(v) => format(parseISO(v), "M/d")}
            fontSize={11}
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" width={48} />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(v) => `Week of ${format(parseISO(String(v)), "MMM d")}`}
            formatter={(value: number) => [Math.round(value).toLocaleString(), "Volume"]}
          />
          <Bar dataKey="volume" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
