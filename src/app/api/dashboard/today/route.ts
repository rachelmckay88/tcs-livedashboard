import { NextResponse } from "next/server";
import { getTodayDashboard } from "@/lib/dashboard/service";

/**
 * Read-only feed for the warehouse display's 20-second poll.
 *
 * Returns the same `DashboardView` the server-rendered page used, so the
 * client can swap it into state directly with no reshaping.
 */
export const dynamic = "force-dynamic";

export async function GET() {
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
