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

    return url.toString();
  } catch {
    // Not a parseable URL — hand it back untouched and let Prisma produce its
    // own (much clearer) validation error.
    return raw;
  }
}

/**
 * Single shared Prisma client.
 *
 * Next.js hot-reloads modules in development, which would otherwise create a
 * new connection pool on every edit until the database runs out of handles.
 * Caching the client on `globalThis` keeps exactly one instance per process.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: connectionUrl(),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
