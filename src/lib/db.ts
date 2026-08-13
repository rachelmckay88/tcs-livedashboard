import { PrismaClient } from "@prisma/client";

/**
 * Single shared Prisma client.
 *
 * Next.js hot-reloads modules in development, which would otherwise create a
 * new connection pool on every edit until SQLite runs out of handles. Caching
 * the client on `globalThis` keeps exactly one instance per process.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
