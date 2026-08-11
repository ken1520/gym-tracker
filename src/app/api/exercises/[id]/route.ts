import { NextResponse } from "next/server";

import { exerciseInputSchema, toFieldErrors } from "@/domain/schemas";
import { updateExercise } from "@/server/repositories/exercises";
import { apiError, apiSuccess } from "@/server/api/response";
import { isDuplicateKeyError } from "@/server/api/errors";

// Route params are async in Next.js 16
type RouteContext = { params: Promise<{ id: string }> };

// PUT rather than PATCH: the schema requires every field, so a save replaces the
// whole exercise. That is also what lets a brand or note be cleared.
export async function PUT(request: Request, { params }: RouteContext) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(apiError("Request body must be valid JSON"), { status: 400 });
  }

  const parsed = exerciseInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      apiError("Validation failed", toFieldErrors(parsed.error)),
      { status: 422 },
    );
  }

  try {
    const exercise = await updateExercise(id, parsed.data);
    if (!exercise) {
      return NextResponse.json(apiError("Exercise not found"), { status: 404 });
    }
    return NextResponse.json(apiSuccess(exercise));
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json(
        apiError("An exercise with that name already exists", {
          name: "Already in your library",
        }),
        { status: 409 },
      );
    }

    console.error(`PUT /api/exercises/${id} failed`, error);
    return NextResponse.json(apiError("Could not update exercise"), { status: 503 });
  }
}
