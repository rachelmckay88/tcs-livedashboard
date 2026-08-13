import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { isAdminAuthenticated } from "@/lib/auth";
import { validateAndSaveDashboard } from "@/lib/dashboard/service";
import { toFieldErrors } from "@/lib/dashboard/schema";

/**
 * Publish (create or update) a day's dashboard.
 *
 * Server-side validation runs here regardless of what the browser already
 * checked — the client-side pass exists for fast feedback, not for safety.
 */
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
    const saved = await validateAndSaveDashboard(payload);
    return NextResponse.json({
      ok: true,
      dashboardDate: saved.dashboardDate,
      updatedAt: saved.updatedAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Please check the highlighted fields.", fieldErrors: toFieldErrors(error) },
        { status: 422 },
      );
    }
    console.error("Failed to save dashboard:", error);
    return NextResponse.json(
      { error: "Could not save. Please try again — your entries are still on screen." },
      { status: 500 },
    );
  }
}
