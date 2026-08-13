import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { isAdminAuthenticated } from "@/lib/auth";
import { addNote, deleteNote, getDashboardRecordByDate } from "@/lib/dashboard/service";
import { addNoteSchema, toFieldErrors } from "@/lib/dashboard/schema";

/** Add a timestamped note (heads up / low stock / stock expected). */
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
    const data = addNoteSchema.parse(payload);
    const dashboard = await getDashboardRecordByDate(data.dashboardDate);
    if (!dashboard) {
      return NextResponse.json(
        { error: "Publish today's dashboard before adding notes to it." },
        { status: 404 },
      );
    }

    const note = await addNote({
      dashboardId: dashboard.id,
      kind: data.kind,
      body: data.body,
    });
    return NextResponse.json({ ok: true, noteId: note.id });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Please check the highlighted fields.", fieldErrors: toFieldErrors(error) },
        { status: 422 },
      );
    }
    console.error("Failed to add note:", error);
    return NextResponse.json({ error: "Could not save. Please try again." }, { status: 500 });
  }
}

/** Remove a note once it no longer applies. */
export async function DELETE(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const noteId = new URL(request.url).searchParams.get("id");
  if (!noteId) {
    return NextResponse.json({ error: "Missing note id." }, { status: 400 });
  }

  try {
    await deleteNote(noteId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete note:", error);
    return NextResponse.json({ error: "Could not remove that note." }, { status: 500 });
  }
}
