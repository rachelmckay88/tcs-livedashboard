"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

/** Single shared password gate for /admin. The display at "/" stays open. */
export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        // Re-run the server component so it picks up the new cookie and
        // renders the form in place of this login screen.
        router.refresh();
        return;
      }

      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Could not sign in. Please try again.");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="tcs-stage flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="tcs-panel w-full max-w-md rounded-3xl p-8 sm:p-10"
        noValidate
      >
        <Lock className="size-8 text-gold-deep" aria-hidden="true" />
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-gold-deep">
          THE CELEBRATION SOCIETY
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Warehouse Today</h1>
        <p className="mt-3 text-ink-muted">
          Enter the warehouse password to see today&rsquo;s board.
        </p>
        <p className="mt-2 text-sm text-ink-faint">
          You&rsquo;ll stay signed in on this device for 90 days — the warehouse screen only needs
          this once.
        </p>

        <label htmlFor="password" className="mt-8 block text-sm font-semibold text-ink-soft">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="tcs-field mt-2"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "password-error" : undefined}
        />

        {error ? (
          <p id="password-error" role="alert" className="mt-3 text-sm font-medium text-action">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting || password.length === 0}
          className="mt-8 w-full rounded-xl bg-ink px-6 py-4 text-base font-bold tracking-wide text-white transition hover:bg-gold-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "SIGNING IN…" : "SIGN IN"}
        </button>

      </form>
    </main>
  );
}
