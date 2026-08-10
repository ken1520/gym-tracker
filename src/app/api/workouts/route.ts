import { NextResponse } from "next/server";

import { toFieldErrors, workoutInputSchema } from "@/domain/schemas";
import { createWorkout, listWorkouts } from "@/server/repositories/workouts";
import { apiError, apiSuccess } from "@/server/api/response";

export async function GET() {
  try {
    const workouts = await listWorkouts();
    return NextResponse.json(apiSuccess(workouts));
  } catch (error) {
    console.error("GET /api/workouts failed", error);
    return NextResponse.json(apiError("Could not load workouts"), { status: 503 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(apiError("Request body must be valid JSON"), { status: 400 });
  }

  const parsed = workoutInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      apiError("Validation failed", toFieldErrors(parsed.error)),
      { status: 422 },
    );
  }

  try {
    const workout = await createWorkout(parsed.data);
    return NextResponse.json(apiSuccess(workout), { status: 201 });
  } catch (error) {
    console.error("POST /api/workouts failed", error);
    return NextResponse.json(apiError("Could not create workout"), { status: 503 });
  }
}
