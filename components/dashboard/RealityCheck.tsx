import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LoggingCheck } from "@/lib/dashboard";

const GAP_THRESHOLD = 150;

function roundTo50(n: number) {
  return Math.round(n / 50) * 50;
}

type Verdict = {
  label: string;
  tone: "good" | "warn";
  explanation: string;
};

function getVerdict(gap: number): Verdict {
  const abs = Math.abs(gap);
  if (abs < GAP_THRESHOLD) {
    return {
      label: "Logs match your weight loss",
      tone: "good",
      explanation:
        "Your logged intake lines up with what the scale is doing. This is the green-light state — keep doing what you're doing.",
    };
  }
  if (gap > 0) {
    return {
      label: `~${roundTo50(gap).toLocaleString()} kcal/day unlogged`,
      tone: "warn",
      explanation:
        "You're losing slower than your logged deficit predicts. Most often this is unmeasured food — oils, condiments, bites off the plate, restaurant meals you eyeballed. Try weighing portions for a week.",
    };
  }
  return {
    label: "Weight moving slower than logs predict",
    tone: "warn",
    explanation:
      "Either your TDEE is lower than the estimate (metabolic adaptation, less NEAT) or you're holding water (training change, sodium, hormonal). Wait a week before adjusting calories.",
  };
}

export function RealityCheck({ check }: { check: LoggingCheck }) {
  if (!check.available) return null;
  const verdict = getVerdict(check.gapKcalPerDay);
  const toneClasses =
    verdict.tone === "good"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
      : "bg-amber-500/10 text-amber-800 dark:text-amber-400 border border-amber-500/30";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Reality check</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className={`rounded-md px-3 py-2 text-sm font-semibold ${toneClasses}`}>
          {verdict.label}
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-0.5">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
              You logged
            </p>
            <p className="font-semibold tabular-nums">
              {check.avgLoggedKcal.toLocaleString()} kcal/day
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
              Reality (est.)
            </p>
            <p className="font-semibold tabular-nums">
              {check.estimatedActualIntake.toLocaleString()} kcal/day
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{verdict.explanation}</p>
        <p className="text-[10px] text-muted-foreground tabular-nums">
          Based on TDEE ~{check.tdee.toLocaleString()} kcal/day and an actual{" "}
          {check.actualWeeklyLossLb.toFixed(2)} lb/wk loss from the last 30 days.
        </p>
      </CardContent>
    </Card>
  );
}

export function RealityCheckPlaceholder({ check }: { check: LoggingCheck }) {
  if (check.available) return null;
  const messages: Record<typeof check.reason, string> = {
    no_tdee: "Set height, sex, birthdate + activity in Settings → Body profile to unlock.",
    not_enough_weights: "Log at least 10 weights in the last 30 days to unlock.",
    not_enough_food_logs: "Log meals for at least 7 days in the last 14 to unlock.",
    no_recent_loss: "Activates once trend weight is going down.",
  };
  return (
    <Card className="border-dashed">
      <CardContent className="py-3 text-xs text-muted-foreground flex items-center gap-2">
        <span className="font-medium text-foreground">Reality check:</span>
        <span>{messages[check.reason]}</span>
      </CardContent>
    </Card>
  );
}
