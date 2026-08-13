import { connect } from "node:net";
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

/**
 * Strip anything credential-shaped before a message goes out over a public
 * endpoint. Prisma's connection errors quote the datasource URL, which carries
 * the password.
 */
function redact(message: string): string {
  // Only redact URLs that actually carry credentials (i.e. contain "@").
  // A blanket match on the protocol also blanks the bare "postgresql://" that
  // Prisma prints when *explaining* the expected format, which destroys the
  // most useful error message it produces.
  return message
    .replace(/postgres(?:ql)?:\/\/\S*@\S*/gi, "[connection-string-redacted]")
    .replace(/:\/\/[^@\s/]+:[^@\s/]+@/g, "://[credentials-redacted]@");
}

/**
 * Raw TCP reach test to the database host.
 *
 * This is the measurement that actually separates the two failure modes:
 * if the socket opens, the network is fine and the fault is TLS, auth or the
 * driver; if it does not, nothing about Prisma is worth investigating yet.
 */
async function tcpProbe(host: string, port: number, timeoutMs = 8000) {
  const started = Date.now();
  return new Promise<{ open: boolean; ms: number; error?: string }>((resolve) => {
    const socket = connect({ host, port });
    const finish = (open: boolean, error?: string) => {
      socket.destroy();
      resolve({ open, ms: Date.now() - started, error });
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false, "timeout"));
    socket.once("error", (e: NodeJS.ErrnoException) => finish(false, e.code ?? e.message));
  });
}

export async function GET() {
  const env = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    ADMIN_PASSWORD: Boolean(process.env.ADMIN_PASSWORD),
    ADMIN_SESSION_SECRET: Boolean(process.env.ADMIN_SESSION_SECRET),
  };

  // What the app actually parsed out of DATABASE_URL — host and parameter
  // *names* only, never the password. A mismatch here against what you think
  // you pasted is itself the answer surprisingly often.
  let datasource: Record<string, unknown> = {};
  let probe: { open: boolean; ms: number; error?: string } | null = null;

  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      const port = Number(url.port || 5432);
      datasource = {
        protocol: url.protocol,
        host: url.hostname,
        port,
        database: url.pathname.replace("/", ""),
        params: [...url.searchParams.keys()],
        pooled: url.hostname.includes("-pooler"),
      };
      probe = await tcpProbe(url.hostname, port);
    } catch {
      datasource = { parseError: "DATABASE_URL is not a valid URL" };
    }
  }

  let database: {
    reachable: boolean;
    error?: string;
    detail?: string;
    dashboards?: number;
  } = { reachable: false };

  if (env.DATABASE_URL) {
    try {
      // Cheapest possible round-trip that proves the schema is really there:
      // a missing table fails differently from a missing connection.
      const dashboards = await prisma.dailyDashboard.count();
      database = { reachable: true, dashboards };
    } catch (error) {
      database = {
        reachable: false,
        error: error instanceof Error ? error.name : "UnknownError",
        // Redacted — Prisma quotes the datasource URL (password included) in
        // connection errors, so this must never go out raw.
        detail: error instanceof Error ? redact(error.message).slice(0, 400) : undefined,
      };
    }
  } else {
    database = { reachable: false, error: "DATABASE_URL is not set" };
  }

  const ok = env.DATABASE_URL && env.ADMIN_PASSWORD && env.ADMIN_SESSION_SECRET && database.reachable;

  return NextResponse.json(
    { ok, env, datasource, tcp: probe, database, region: process.env.VERCEL_REGION ?? "local" },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
