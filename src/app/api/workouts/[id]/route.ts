import { NextResponse } from "next/server";

import { toFieldErrors, workoutInputSchema } from "@/domain/schemas";
import { resolveWorkoutScope } from "@/domain/scope";
import { deleteWorkout, findWorkout, updateWorkout } from "@/server/repositories/workouts";
import { apiError, apiSuccess } from "@/server/api/response";
import { authorizeRequest } from "@/server/api/guards";

// Route params are async in Next.js 16
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const auth = await authorizeRequest();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  // Reads widen to every account for an admin; a plain user only ever sees
  // their own, and someone else's workout is a 404 rather than a 403 — which
  // would confirm the id exists
  const scope = resolveWorkoutScope(auth.user.role, auth.user.id, "all");

  try {
    const workout = await findWorkout(scope, id);
    if (!workout) {
      return NextResponse.json(apiError("Workout not found"), { status: 404 });
    }
    return NextResponse.json(apiSuccess(workout));
  } catch (error) {
    console.error(`GET /api/workouts/${id} failed`, error);
    return NextResponse.json(apiError("Could not load workout"), { status: 503 });
  }
}

// PUT rather than PATCH: the schema requires every field, so a save replaces
// the whole workout, entries included
export async function PUT(request: Request, { params }: RouteContext) {
  const auth = await authorizeRequest();
  if (!auth.ok) return auth.response;

  const { id } = await params;

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
    // Writes never widen: an admin reads every log but edits only their own
    const workout = await updateWorkout(auth.user.id, id, parsed.data);
    if (!workout) {
      return NextResponse.json(apiError("Workout not found"), { status: 404 });
    }
    return NextResponse.json(apiSuccess(workout));
  } catch (error) {
    console.error(`PUT /api/workouts/${id} failed`, error);
    return NextResponse.json(apiError("Could not update workout"), { status: 503 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const auth = await authorizeRequest();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const deleted = await deleteWorkout(auth.user.id, id);
    if (!deleted) {
      return NextResponse.json(apiError("Workout not found"), { status: 404 });
    }
    return NextResponse.json(apiSuccess({ id }));
  } catch (error) {
    console.error(`DELETE /api/workouts/${id} failed`, error);
    return NextResponse.json(apiError("Could not delete workout"), { status: 503 });
  }
}
