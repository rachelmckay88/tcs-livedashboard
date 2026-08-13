# Future Shopify integration — technical note

**Status: not built.** V1 is manual entry only. This note records where Shopify
would plug in, so the decision does not have to be reverse-engineered later.

Nothing in the app calls Shopify today. `src/lib/shopify/service.ts` exists as
a typed placeholder and is imported by nothing.

---

## 1. Where Shopify data enters the application

There is exactly one seam: **`toDashboardView()` in
`src/lib/dashboard/service.ts`**.

Every screen consumes the `DashboardView` object that function returns. No
component queries the database, and no component would query Shopify. So long
as new data is merged in there, no screen needs redesigning.

The intended shape, already marked with a comment in that file:

```ts
const shopify = await getShopifyCounts(record.personalisingOrderDate);

// Manual entry always wins; Shopify only fills the gaps.
value:  record.personalisedOrderCount ?? shopify?.personalisedOrders ?? null,
source: record.personalisedOrderCount != null ? "MANUAL" : "SHOPIFY",
```

**Precedence rule: a number a human typed always beats a number from Shopify.**
The morning admin is the operational truth for the day. Shopify fills blanks;
it never overwrites.

The `Metric` type already carries a `source: "MANUAL" | "SHOPIFY"` field, unused
in V1. It is there so the display can later show a small "live" marker on
automated figures without changing any component's props.

### Where it must NOT go

- Not in components — they would need Shopify mocks to render.
- Not in `page.tsx` — the poll endpoint would then bypass it and the two would drift.
- Not in the Prisma schema — Shopify figures are derived, not authored, and
  writing them into `DailyDashboard` would destroy the manual/automatic
  distinction that makes the precedence rule work.

---

## 2. Which manual fields could become automatic

| Field                       | Shopify source                                            | Confidence |
| --------------------------- | --------------------------------------------------------- | ---------- |
| `personalisedOrderCount`    | Orders in the batch with a personalisation line-item property | High   |
| `personalisedItemCount`     | Sum of quantities on those line items                     | High       |
| `nonPersonalisedOrderCount` | Orders in the batch without personalisation               | High       |
| `expressCount`              | Shipping tier / rate name, or an `express` order tag      | Medium     |
| `priorityCount`             | Order tag — only if tagging is applied consistently       | Medium     |
| `shippingOrderCount`        | Orders fulfilled or marked ready on the day               | Medium     |
| `shippingItemCount`         | Line-item quantities on those orders                      | Medium     |
| (new) overnight orders      | Orders created since the previous cut-off                 | High       |

The "medium" rows depend on warehouse tagging discipline rather than on the API.
Confirm the tags are actually applied before trusting them on a wall display.

## 3. Which fields should stay manual

These encode human judgement that Shopify has no view of:

- **Checkpoint progress counts** — "how many have we finished personalising by
  noon" is a physical count on the floor, not an order attribute. Shopify knows
  when an order was *fulfilled*, which is a different and later event. Do not be
  tempted to substitute one for the other; the meters would quietly stop
  meaning what the team thinks they mean.
- **The roster** — who is in today.
- `personalisingOrderDate` and `shippingOrderDate` — which batch the floor has
  actually chosen to work on today. This is a production decision, not a fact
  derivable from order data.
- `redoCount` — quality failures, typically not tracked digitally.
- `onHoldCount` — an operational judgement (stock, artwork, customer contact).
- `overallStatus` — how the day *feels* to the person running it.
- `dailyMessage` / `secondaryMessage` — the instructions that make the board
  worth looking at.
- `courierCutoff` — usually fixed, occasionally changed by a phone call.

Automating these would make the board less accurate, not more.

---

## 4. How to add credentials, API calls and webhooks

### Credentials

The variable names are already reserved (commented out) in `.env.example`:

```
SHOPIFY_STORE_DOMAIN="the-celebration-society.myshopify.com"
SHOPIFY_ADMIN_ACCESS_TOKEN=""
SHOPIFY_API_VERSION="2026-07"
SHOPIFY_WEBHOOK_SECRET=""
```

Use a custom app in the Shopify admin with the narrowest scopes that work —
`read_orders` alone is likely enough. The token is server-only: it must never
reach a client component. Everything under `src/lib/shopify/` is server code
and should stay that way.

### API calls

Prefer the GraphQL Admin API and request only the fields needed, in one query
per batch date. Two constraints matter:

1. **Never throw into a render path.** `getShopifyCounts()` is typed to return
   `null` on failure for this reason. If Shopify is down, the board must keep
   showing manual figures — a blank warehouse TV is worse than a stale one.
2. **Cache.** The display polls every 20 seconds per open screen. Without
   caching that becomes a steady stream of Shopify calls for data that changes
   a few times a day. Wrap the fetch in Next's `unstable_cache` (or a small
   in-memory TTL) with a window of 2–5 minutes.

Count orders by their **Sydney-local** `createdAt` date, matching how the
warehouse thinks about a batch. `src/lib/dates.ts` already has the helpers —
do not introduce a second date convention.

### Webhooks

Polling is likely sufficient. If push updates are wanted later, add
`src/app/api/webhooks/shopify/route.ts`:

1. Verify the HMAC in the `X-Shopify-Hmac-Sha256` header against
   `SHOPIFY_WEBHOOK_SECRET` **before** parsing the body, using the raw bytes.
   Reject with 401 on mismatch.
2. Return 200 quickly; do any real work after responding. Shopify retries on
   timeout and will duplicate the delivery.
3. Treat deliveries as idempotent — the same order can arrive more than once.

Relevant topics: `orders/create`, `orders/updated`, `orders/fulfilled`.

---

## 5. Suggested order of work

1. Read-only script that prints counts for one batch date. Compare against what
   the admin typed that morning for a week. **Do not put it on the board yet.**
2. Once the numbers agree, implement `getShopifyCounts()` with caching and the
   null-on-failure contract.
3. Wire it into `toDashboardView()` behind the manual-wins precedence rule.
4. Only then consider surfacing `source: "SHOPIFY"` in the UI.

Step 1 is the important one. A wrong number on a warehouse wall costs more than
a manual entry does — the board's whole value is that the floor trusts it.
