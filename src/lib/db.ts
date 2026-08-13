import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";

/**
 * Connection settings that a serverless deployment needs and a laptop does not.
 *
 * Both of these caused real failures on Vercel while working perfectly against
 * the same database locally, so they are applied in code rather than left to
 * whoever pastes the connection string into a dashboard:
 *
 *  - `connect_timeout` — Neon suspends idle compute, and the first connection
 *    has to wake it. Prisma's 5-second default can expire during that wake-up,
 *    and it reports the timeout as "Can't reach database server", which sends
 *    you hunting for a network fault that isn't there.
 *
 *  - `pgbouncer=true` — required whenever the host is Neon's pooled endpoint
 *    (`-pooler`). PgBouncer runs in transaction mode and cannot hold the
 *    prepared statements Prisma would otherwise create.
 */
function connectionUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;

  try {
    const url = new URL(raw);

    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", "30");
    }
    if (url.hostname.includes("-pooler") && !url.searchParams.has("pgbouncer")) {
      url.searchParams.set("pgbouncer", "true");
    }

    // Neon's console hands out connection strings containing
    // `channel_binding=require`. It is a libpq option; Prisma's Rust driver
    // does not implement SCRAM channel binding, so requiring it can fail the
    // handshake. Dropping it does not weaken anything meaningful — the
    // connection is still SCRAM-SHA-256 over TLS, enforced by sslmode.
    url.searchParams.delete("channel_binding");

    return url.toString();
  } catch {
    // Not a parseable URL — hand it back untouched and let Prisma produce its
    // own (much clearer) validation error.
    return raw;
  }
}

/**
 * Single shared Prisma client, talking to Neon through its serverless driver.
 *
 * WHY THE ADAPTER RATHER THAN A PLAIN CONNECTION STRING
 * Prisma's default engine opens a raw TCP connection and does its own TLS. On
 * Vercel that handshake failed against Neon even though the socket itself
 * opened in 2ms from the same region — the failure was reported as
 * "Can't reach database server", which is misleading, and it survived every
 * network-level fix (region, timeouts, engine target, channel_binding).
 *
 * The Neon adapter connects over Neon's own serverless driver instead, which
 * is what both Neon and Prisma recommend for serverless. It also suits the
 * platform better: no TCP pool to maintain across short-lived invocations.
 *
 * Next.js hot-reloads modules in development, which would otherwise create a
 * new client on every edit. Caching on `globalThis` keeps one per process.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient(): PrismaClient {
  const url = connectionUrl();
  return new PrismaClient({
    adapter: new PrismaNeon({ connectionString: url }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
