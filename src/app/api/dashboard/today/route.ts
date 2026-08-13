import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getTodayDashboard } from "@/lib/dashboard/service";

/**
 * Read-only feed for the warehouse display's 20-second poll.
 *
 * Returns the same `DashboardView` the server-rendered page used, so the
 * client can swap it into state directly with no reshaping.
 *
 * Gated like the page it feeds — otherwise the whole board would be readable
 * as JSON by anyone, which would make locking the page pointless.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    const view = await getTodayDashboard();
    return NextResponse.json(view, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("Failed to load today's dashboard:", error);
    // The display keeps its last good data when this fails — see
    // WarehouseDashboard's poll() catch.
    return NextResponse.json({ error: "Unable to load dashboard" }, { status: 500 });
  }
}
