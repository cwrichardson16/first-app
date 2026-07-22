import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json();
  const prompt = body.prompt?.trim();
  const mode = body.mode;
  if (!prompt || !["workout", "food"].includes(mode)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { data: settings } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  try {
    if (mode === "workout") {
      return await generateWorkout(supabase, user.id, prompt, settings);
    } else {
      return await estimateFood(prompt);
    }
  } catch (err) {
    console.error("AI generation error:", err);
    return NextResponse.json(
      { error: "AI generation failed. Please try again." },
      { status: 500 },
    );
  }
}

async function estimateFood(prompt: string) {
  const systemInstruction = `You are a nutrition calculator. The user will describe a food or meal they ate, possibly with a serving size. Estimate the macronutrients.

Rules:
- Return your best estimate for a single food/meal entry
- Use realistic portion sizes (if the user doesn't specify, assume a standard serving)
- All numbers should be integers
- The "name" should be a clean, concise version of what they described

Respond with ONLY valid JSON:
{
  "name": "Clean food name",
  "calories": 500,
  "protein": 40,
  "fat": 15,
  "carbs": 45
}`;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction,
    generationConfig: { responseMimeType: "application/json" },
  });

  const result = await model.generateContent(prompt);
  const data = JSON.parse(result.response.text());

  return NextResponse.json(data);
}

async function generateWorkout(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  prompt: string,
  settings: Record<string, unknown> | null,
) {
  // Get recent workouts
  const { data: recentWorkouts } = await supabase
    .from("workouts")
    .select("id, name, workout_date")
    .eq("user_id", userId)
    .order("workout_date", { ascending: false })
    .limit(10);

  let exerciseHistory = "";
  const uniqueExercises: string[] = [];

  if (recentWorkouts && recentWorkouts.length > 0) {
    const workoutIds = recentWorkouts.map((w) => w.id);
    const { data: sets } = await supabase
      .from("exercise_sets")
      .select("workout_id, exercise_name, weight, reps")
      .in("workout_id", workoutIds)
      .order("exercise_order", { ascending: true })
      .order("set_number", { ascending: true });

    const grouped = new Map<
      string,
      {
        name: string;
        date: string;
        exercises: Map<string, { weight: number | null; reps: number | null }[]>;
      }
    >();

    for (const w of recentWorkouts) {
      grouped.set(w.id, { name: w.name, date: w.workout_date, exercises: new Map() });
    }

    const nameSet = new Set<string>();
    for (const s of sets ?? []) {
      nameSet.add(s.exercise_name);
      const workout = grouped.get(s.workout_id);
      if (!workout) continue;
      if (!workout.exercises.has(s.exercise_name)) {
        workout.exercises.set(s.exercise_name, []);
      }
      workout.exercises.get(s.exercise_name)!.push({ weight: s.weight, reps: s.reps });
    }
    uniqueExercises.push(...nameSet);

    const historyLines: string[] = [];
    for (const [, w] of grouped) {
      const exerciseStrs: string[] = [];
      for (const [name, wSets] of w.exercises) {
        const setStrs = wSets.map((s) => `${s.weight ?? "BW"}x${s.reps ?? "?"}`).join(", ");
        exerciseStrs.push(`  ${name}: ${setStrs}`);
      }
      if (exerciseStrs.length > 0) {
        historyLines.push(`${w.date} - ${w.name}:\n${exerciseStrs.join("\n")}`);
      }
    }
    exerciseHistory = historyLines.join("\n\n");
  }

  const units = (settings?.units as string) ?? "imperial";
  const weightUnit = units === "metric" ? "kg" : "lbs";

  const systemInstruction = `You are a concise fitness coach. Generate a workout based on the user's request.

User context:
- Units: ${units} (weights in ${weightUnit})
${settings?.start_weight ? `- Start weight: ${settings.start_weight} ${weightUnit}` : ""}
${settings?.goal_weight ? `- Goal weight: ${settings.goal_weight} ${weightUnit}` : ""}

${exerciseHistory ? `Recent workout history (last 10):\n${exerciseHistory}` : "No workout history yet — suggest moderate weights."}

${uniqueExercises.length > 0 ? `Exercise names this user has used (use these exact names when applicable): ${uniqueExercises.join(", ")}` : ""}

Rules:
- Use the user's existing exercise names when the same exercise is intended
- Base suggested weights on their recent history when available
- Each strength exercise should have 3-4 sets unless specified otherwise
- Strength: include weight (number in ${weightUnit}, or null for bodyweight) and reps
- Cardio: include duration_minutes, distance (optional), distance_unit ("mi" or "km"), calories_burned (estimated)
- Set exercise_type to "strength" or "cardio" for each exercise
- If the user mentions running, treadmill, cycling, rowing, etc., use "cardio" type
- Estimate calories_burned for cardio based on exercise type, duration, and intensity

Respond with ONLY valid JSON:
{
  "name": "Workout Name",
  "duration_minutes": 60,
  "exercises": [
    {
      "exercise_name": "Bench Press",
      "exercise_type": "strength",
      "sets": [
        { "weight": 135, "reps": 10 }
      ]
    },
    {
      "exercise_name": "Treadmill",
      "exercise_type": "cardio",
      "cardio": {
        "duration_minutes": 20,
        "distance": 2.0,
        "distance_unit": "mi",
        "calories_burned": 250
      }
    }
  ]
}`;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction,
    generationConfig: { responseMimeType: "application/json" },
  });

  const result = await model.generateContent(prompt);
  const workout = JSON.parse(result.response.text());

  return NextResponse.json(workout);
}
