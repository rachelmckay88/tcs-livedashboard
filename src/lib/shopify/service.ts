/**
 * Shopify integration — PLACEHOLDER. Not implemented in V1, and not called
 * from anywhere yet.
 *
 * This file exists so the eventual integration has an obvious, agreed home
 * rather than being retrofitted into components. The full plan lives in
 * docs/SHOPIFY-INTEGRATION.md.
 *
 * The rule that keeps V1 clean: nothing outside this folder may know that
 * Shopify exists. The only consumer will be `toDashboardView` in
 * src/lib/dashboard/service.ts, which already has the wiring point marked.
 */

/**
 * The counts Shopify could eventually supply for one order-batch date.
 * Every field is optional — a partial answer is still useful, and the
 * dashboard must degrade gracefully when Shopify is slow or unreachable.
 */
export type ShopifyBatchCounts = {
  /** Order-batch date these counts describe, "YYYY-MM-DD" (Sydney). */
  orderDateKey: string;
  personalisedOrders?: number;
  personalisedItems?: number;
  nonPersonalisedOrders?: number;
  expressOrders?: number;
  priorityOrders?: number;
  /** Orders received overnight — a likely future headline metric. */
  overnightOrders?: number;
};

/** Whether Shopify credentials are configured. Always false in V1. */
export function isShopifyEnabled(): boolean {
  return false;
}

/**
 * FUTURE: fetch order counts for an order-batch date.
 *
 * Intended contract when implemented:
 *   - Returns null when disabled, erroring, or timing out. Never throws into
 *     a render path — the warehouse board must keep working regardless.
 *   - Cheap enough to call on each dashboard read, or cached (e.g. Next
 *     `unstable_cache` / a short revalidate window) so the 20-second display
 *     poll cannot hammer the Shopify API.
 *   - Counts orders by their Sydney-local created_at date, matching how the
 *     warehouse thinks about a "batch".
 */
export async function getShopifyCounts(
  orderDateKey: string | null,
): Promise<ShopifyBatchCounts | null> {
  void orderDateKey;
  // Deliberately unimplemented in V1 — manual entry is the source of truth.
  return null;
}
