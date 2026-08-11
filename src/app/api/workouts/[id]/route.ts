import { NextResponse } from "next/server";

import { toFieldErrors, workoutInputSchema } from "@/domain/schemas";
import { deleteWorkout, findWorkout, updateWorkout } from "@/server/repositories/workouts";
import { apiError, apiSuccess } from "@/server/api/response";

// Route params are async in Next.js 16
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  try {
    const workout = await findWorkout(id);
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
    const workout = await updateWorkout(id, parsed.data);
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
  const { id } = await params;

  try {
    const deleted = await deleteWorkout(id);
    if (!deleted) {
      return NextResponse.json(apiError("Workout not found"), { status: 404 });
    }
    return NextResponse.json(apiSuccess({ id }));
  } catch (error) {
    console.error(`DELETE /api/workouts/${id} failed`, error);
    return NextResponse.json(apiError("Could not delete workout"), { status: 503 });
  }
}
