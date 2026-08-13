import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { isAdminAuthenticated } from "@/lib/auth";
import { saveCheckpoint } from "@/lib/dashboard/service";
import { saveCheckpointSchema, toFieldErrors } from "@/lib/dashboard/schema";

/** Record a check-in: cumulative counts at one point in the day. */
export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const data = saveCheckpointSchema.parse(payload);
    const saved = await saveCheckpoint(data);
    return NextResponse.json({ ok: true, checkpointId: saved.id });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Please check the highlighted fields.", fieldErrors: toFieldErrors(error) },
        { status: 422 },
      );
    }
    console.error("Failed to save checkpoint:", error);
    return NextResponse.json({ error: "Could not save. Please try again." }, { status: 500 });
  }
}
