"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    // Re-run the server component, which now sees no cookie and shows login.
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="inline-flex items-center gap-2 rounded-xl border border-rule px-4 py-2.5 text-sm font-semibold text-ink-muted transition hover:border-gold/50 hover:text-ink"
    >
      <LogOut className="size-4" aria-hidden="true" />
      Sign out
    </button>
  );
}
