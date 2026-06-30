// Body composition math — pure functions, no side effects.
// All inputs in imperial (lb, in); we convert internally.

const LB_TO_KG = 0.45359237;
const IN_TO_CM = 2.54;

export type Sex = "male" | "female" | "other";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentary (desk job, no exercise)",
  light: "Light (1–3 workouts/wk)",
  moderate: "Moderate (3–5 workouts/wk)",
  active: "Active (6–7 workouts/wk)",
  very_active: "Very active (twice daily or physical job)",
};

// Mifflin-St Jeor — current scientific consensus, ~5% MAE in adults.
export function bmr(input: {
  weightLb: number;
  heightIn: number;
  ageYears: number;
  sex: Sex;
}): number {
  const kg = input.weightLb * LB_TO_KG;
  const cm = input.heightIn * IN_TO_CM;
  const base = 10 * kg + 6.25 * cm - 5 * input.ageYears;
  if (input.sex === "male") return Math.round(base + 5);
  if (input.sex === "female") return Math.round(base - 161);
  // "other" — average of male/female offsets.
  return Math.round(base + (5 + -161) / 2);
}

export function tdee(input: {
  bmrKcal: number;
  activity: ActivityLevel;
}): number {
  return Math.round(input.bmrKcal * ACTIVITY_FACTOR[input.activity]);
}

// BMI in imperial: weight × 703 / height²
export function bmi(weightLb: number, heightIn: number): number {
  if (heightIn <= 0) return 0;
  return Math.round((weightLb * 703 * 10) / (heightIn * heightIn)) / 10;
}

export function bmiCategory(value: number): string {
  if (value < 18.5) return "Underweight";
  if (value < 25) return "Normal";
  if (value < 30) return "Overweight";
  return "Obese";
}

// 1 lb body fat ≈ 3500 kcal. Suggested intake = TDEE − weekly deficit / 7.
export function suggestedCalorieTarget(input: {
  tdeeKcal: number;
  weeklyLossLb: number;
}): number {
  const dailyDeficit = (input.weeklyLossLb * 3500) / 7;
  return Math.round(input.tdeeKcal - dailyDeficit);
}

// Compendium of Physical Activities, rounded for the three buckets we expose.
// "Light" = bodyweight / circuit / easy walking — code 02050
// "Moderate" = general resistance training — code 02054
// "Vigorous" = powerlifting / heavy compound work — code 02052
const MET: Record<"light" | "moderate" | "vigorous", number> = {
  light: 3.5,
  moderate: 5.0,
  vigorous: 6.0,
};

export function workoutCaloriesBurned(input: {
  weightLb: number;
  durationMin: number;
  intensity: "light" | "moderate" | "vigorous";
}): number {
  const kg = input.weightLb * LB_TO_KG;
  const hours = input.durationMin / 60;
  return Math.round(MET[input.intensity] * kg * hours);
}

export function ageFromBirthdate(birthdate: string, today: Date = new Date()): number {
  const b = new Date(birthdate + "T00:00:00Z");
  let age = today.getUTCFullYear() - b.getUTCFullYear();
  const m = today.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && today.getUTCDate() < b.getUTCDate())) age -= 1;
  return age;
}

// Convenience: compute the full energy-balance picture from settings + current weight.
// Returns null fields when the necessary inputs aren't present yet.
export type EnergyPicture = {
  bmr: number | null;
  tdee: number | null;
  bmi: number | null;
  bmiCategory: string | null;
  suggestedCalories: number | null;
};

export function energyPicture(input: {
  currentWeightLb: number | null;
  heightIn: number | null;
  sex: Sex | null;
  birthdate: string | null;
  activity: ActivityLevel | null;
  weeklyLossLb: number | null;
}): EnergyPicture {
  const { currentWeightLb, heightIn, sex, birthdate, activity } = input;
  if (!currentWeightLb || !heightIn || !sex || !birthdate) {
    return { bmr: null, tdee: null, bmi: null, bmiCategory: null, suggestedCalories: null };
  }
  const age = ageFromBirthdate(birthdate);
  const b = bmr({ weightLb: currentWeightLb, heightIn, ageYears: age, sex });
  const t = activity ? tdee({ bmrKcal: b, activity }) : null;
  const bmiVal = bmi(currentWeightLb, heightIn);
  const sug =
    t !== null && input.weeklyLossLb
      ? suggestedCalorieTarget({ tdeeKcal: t, weeklyLossLb: input.weeklyLossLb })
      : null;
  return {
    bmr: b,
    tdee: t,
    bmi: bmiVal,
    bmiCategory: bmiCategory(bmiVal),
    suggestedCalories: sug,
  };
}
