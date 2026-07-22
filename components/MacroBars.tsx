import { Flame } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type Row = {
  label: string;
  unit: string;
  value: number;
  target: number;
  accent: string;
};

function MacroRow({ label, unit, value, target, accent }: Row) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  const remaining = target - value;
  const over = value > target;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className="tabular-nums text-sm">
          <span className="font-semibold text-foreground">
            {value.toLocaleString()}
            {unit}
          </span>
          <span className="text-muted-foreground">
            {" "}
            / {target.toLocaleString()}
            {unit}
          </span>
        </span>
      </div>
      <Progress value={pct} indicatorClassName={cn(accent, over && "bg-warning")} />
      <p className={cn("text-xs tabular-nums", over ? "text-warning" : "text-muted-foreground")}>
        {over
          ? `${Math.abs(remaining).toLocaleString()}${unit} over`
          : `${remaining.toLocaleString()}${unit} left`}
      </p>
    </div>
  );
}

export function MacroBars({
  calories,
  protein,
  fat,
  carbs,
  targets,
  caloriesBurned = 0,
}: {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  targets: { calorie_target: number; protein_target: number; fat_target: number; carb_target: number };
  caloriesBurned?: number;
}) {
  const net = calories - caloriesBurned;
  return (
    <div className="space-y-4">
      <MacroRow
        label="Calories"
        unit=""
        value={calories}
        target={targets.calorie_target}
        accent="bg-primary"
      />
      {caloriesBurned > 0 && (
        <div className="flex items-center justify-between text-sm -mt-2 px-0.5">
          <span className="flex items-center gap-1 text-orange-400">
            <Flame className="h-3.5 w-3.5" />
            <span className="tabular-nums">{caloriesBurned} burned</span>
          </span>
          <span className="text-muted-foreground tabular-nums">
            Net: <span className="font-semibold text-foreground">{net.toLocaleString()}</span>
          </span>
        </div>
      )}
      <div className="grid grid-cols-3 gap-4">
        <MacroRow
          label="Protein"
          unit="g"
          value={protein}
          target={targets.protein_target}
          accent="bg-emerald-500"
        />
        <MacroRow
          label="Fat"
          unit="g"
          value={fat}
          target={targets.fat_target}
          accent="bg-amber-500"
        />
        <MacroRow
          label="Carbs"
          unit="g"
          value={carbs}
          target={targets.carb_target}
          accent="bg-sky-500"
        />
      </div>
    </div>
  );
}
