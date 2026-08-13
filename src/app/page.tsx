import { AdminLogin } from "@/components/admin/AdminLogin";
import { WarehouseDashboard } from "@/components/dashboard/WarehouseDashboard";
import { isAdminAuthenticated } from "@/lib/auth";
import { getTodayDashboard } from "@/lib/dashboard/service";

/**
 * The warehouse display — the default homepage.
 *
 * Rendered fresh on every request (never cached) so a TV that reconnects after
 * a power cut immediately shows current data rather than a stale build.
 *
 * Behind the shared password like everything else: on a public URL the board
 * would otherwise expose order volumes, staff names and the day's notes to
 * anyone with the link. The session lasts 90 days and survives reboots, so in
 * practice the TV is signed in once and left alone.
 */
export const dynamic = "force-dynamic";

export default async function WarehouseDisplayPage() {
  if (!(await isAdminAuthenticated())) {
    return <AdminLogin />;
  }

  const view = await getTodayDashboard();
  return <WarehouseDashboard initialView={view} />;
}
