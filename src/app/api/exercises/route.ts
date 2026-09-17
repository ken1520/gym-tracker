import { NextResponse } from "next/server";

import { exerciseInputSchema, toFieldErrors } from "@/domain/schemas";
import { createExercise, listExercises } from "@/server/repositories/exercises";
import { apiError, apiSuccess } from "@/server/api/response";
import { isDuplicateKeyError } from "@/server/api/errors";
import { authorizeRequest } from "@/server/api/guards";
import { canManageExercises } from "@/domain/roles";

export async function GET() {
  // The library is readable by every signed-in account, not by the public
  const auth = await authorizeRequest();
  if (!auth.ok) return auth.response;

  try {
    const exercises = await listExercises();
    return NextResponse.json(apiSuccess(exercises));
  } catch (error) {
    console.error("GET /api/exercises failed", error);
    return NextResponse.json(apiError("Could not load exercises"), { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = await authorizeRequest(canManageExercises);
  if (!auth.ok) return auth.response;

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
    const exercise = await createExercise(parsed.data);
    return NextResponse.json(apiSuccess(exercise), { status: 201 });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json(
        apiError("That exercise already exists with the same equipment", {
          name: "Already in your library with this equipment",
        }),
        { status: 409 },
      );
    }

    console.error("POST /api/exercises failed", error);
    return NextResponse.json(apiError("Could not create exercise"), { status: 503 });
  }
}
