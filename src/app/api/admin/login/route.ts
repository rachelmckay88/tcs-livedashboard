import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  createSessionToken,
  isValidPassword,
  sessionCookieOptions,
} from "@/lib/auth";

export async function POST(request: Request) {
  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    if (!isValidPassword(password)) {
      return NextResponse.json({ error: "That password is not correct." }, { status: 401 });
    }
  } catch (error) {
    // Missing ADMIN_PASSWORD / ADMIN_SESSION_SECRET — a setup problem, so say
    // so plainly rather than pretending the password was wrong.
    console.error("Admin login misconfigured:", error);
    return NextResponse.json(
      { error: "Admin login is not configured. Check ADMIN_PASSWORD in the server environment." },
      { status: 500 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, createSessionToken(), sessionCookieOptions());
  return response;
}
