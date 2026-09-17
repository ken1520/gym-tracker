import { NextResponse } from "next/server";

import { toFieldErrors, workoutInputSchema } from "@/domain/schemas";
import { resolveWorkoutScope } from "@/domain/scope";
import { createWorkout, listWorkouts } from "@/server/repositories/workouts";
import { apiError, apiSuccess } from "@/server/api/response";
import { authorizeRequest } from "@/server/api/guards";

export async function GET(request: Request) {
  const auth = await authorizeRequest();
  if (!auth.ok) return auth.response;

  // ?scope=all mirrors the History page. resolveWorkoutScope ignores it for a
  // non-admin rather than refusing, so the param is safe to pass blindly
  const requested = new URL(request.url).searchParams.get("scope") ?? undefined;
  const scope = resolveWorkoutScope(auth.user.role, auth.user.id, requested);

  try {
    const workouts = await listWorkouts(scope);
    return NextResponse.json(apiSuccess(workouts));
  } catch (error) {
    console.error("GET /api/workouts failed", error);
    return NextResponse.json(apiError("Could not load workouts"), { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = await authorizeRequest();
  if (!auth.ok) return auth.response;

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
    // The owner comes from the session, never from the body — otherwise any
    // account could write history into someone else's log
    const workout = await createWorkout(auth.user.id, parsed.data);
    return NextResponse.json(apiSuccess(workout), { status: 201 });
  } catch (error) {
    console.error("POST /api/workouts failed", error);
    return NextResponse.json(apiError("Could not create workout"), { status: 503 });
  }
}
