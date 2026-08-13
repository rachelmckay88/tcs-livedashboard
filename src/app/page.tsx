import { WarehouseDashboard } from "@/components/dashboard/WarehouseDashboard";
import { getTodayDashboard } from "@/lib/dashboard/service";

/**
 * The warehouse display — the default homepage.
 *
 * Rendered fresh on every request (never cached) so a TV that reconnects after
 * a power cut immediately shows current data rather than a stale build.
 */
export const dynamic = "force-dynamic";

export default async function WarehouseDisplayPage() {
  const view = await getTodayDashboard();
  return <WarehouseDashboard initialView={view} />;
}
