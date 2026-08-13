import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Deployment health check.
 *
 * Unauthenticated on purpose — it is the one thing you need when a fresh
 * deployment misbehaves and you cannot get far enough in to see anything else.
 *
 * It reveals NO data and NO secrets: only whether each required environment
 * variable is present, and whether the database answered. Never add values,
 * connection strings or error messages to this response — error *names* only,
 * since a driver's message can contain the host and credentials.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const env = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    ADMIN_PASSWORD: Boolean(process.env.ADMIN_PASSWORD),
    ADMIN_SESSION_SECRET: Boolean(process.env.ADMIN_SESSION_SECRET),
  };

  let database: { reachable: boolean; error?: string; dashboards?: number } = {
    reachable: false,
  };

  if (env.DATABASE_URL) {
    try {
      // Cheapest possible round-trip that proves the schema is really there:
      // a missing table fails differently from a missing connection.
      const dashboards = await prisma.dailyDashboard.count();
      database = { reachable: true, dashboards };
    } catch (error) {
      database = {
        reachable: false,
        // Class name only — Prisma error messages can echo the connection
        // string, which must never appear on a public endpoint.
        error: error instanceof Error ? error.name : "UnknownError",
      };
    }
  } else {
    database = { reachable: false, error: "DATABASE_URL is not set" };
  }

  const ok = env.DATABASE_URL && env.ADMIN_PASSWORD && env.ADMIN_SESSION_SECRET && database.reachable;

  return NextResponse.json(
    { ok, env, database },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
