import Link from "next/link";
import { ExternalLink, Sunrise } from "lucide-react";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { CheckInForm } from "@/components/admin/CheckInForm";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { isAdminAuthenticated } from "@/lib/auth";
import { getDashboardRecordByDate, toDashboardView } from "@/lib/dashboard/service";
import { formatFullDate, todaySydneyDateKey } from "@/lib/dates";

export const dynamic = "force-dynamic";

/**
 * The during-the-day screen: 9 AM / 12 PM / 3 PM check-ins and ad-hoc notes.
 * Deliberately short — see CheckInForm for why it is split from the morning form.
 */
export default async function CheckInPage() {
  if (!(await isAdminAuthenticated())) {
    return <AdminLogin />;
  }

  const dateKey = todaySydneyDateKey();
  const record = await getDashboardRecordByDate(dateKey);
  const view = toDashboardView(record, dateKey);

  return (
    <div className="tcs-stage min-h-screen">
      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 px-5 py-6 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-deep">
              THE CELEBRATION SOCIETY
            </p>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Check-in
            </h1>
            <p className="mt-1.5 text-ink-muted">{formatFullDate(dateKey)}</p>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-xl border border-rule px-4 py-2.5 text-sm font-semibold text-ink-muted transition hover:border-gold hover:text-ink"
            >
              <Sunrise className="size-4" aria-hidden="true" />
              Morning update
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-rule px-4 py-2.5 text-sm font-semibold text-ink-muted transition hover:border-gold hover:text-ink"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              Display
            </Link>
            <LogoutButton />
          </nav>
        </div>
      </header>

      {!record?.isPublished ? (
        <div className="mx-auto max-w-3xl px-5 pt-6 sm:px-6">
          <p className="rounded-2xl border border-busy/50 bg-busy-wash px-5 py-4 text-ink-soft">
            Today&rsquo;s dashboard has not been published yet.{" "}
            <Link href="/admin" className="font-semibold text-gold-deep underline underline-offset-4">
              Do the morning update first
            </Link>
            .
          </p>
        </div>
      ) : null}

      <CheckInForm
        dashboardDate={dateKey}
        checkpoints={view.checkpoints}
        notes={view.notes}
        personalisedTarget={view.production.progress.target}
        shippingTarget={view.shipping.progress.target}
      />
    </div>
  );
}
