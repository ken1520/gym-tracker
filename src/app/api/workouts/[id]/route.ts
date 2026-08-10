import { NextResponse } from "next/server";

import { deleteWorkout, findWorkout } from "@/server/repositories/workouts";
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
