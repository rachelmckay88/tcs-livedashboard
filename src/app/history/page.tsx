import Link from "next/link";
import { ArrowLeft, PencilLine } from "lucide-react";
import { listDashboards } from "@/lib/dashboard/service";
import { formatBatchDate, formatShortDate } from "@/lib/dates";
import { STATUS_LABELS, type OverallStatus } from "@/lib/dashboard/types";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { isAdminAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

const STATUS_PILL: Record<OverallStatus, string> = {
  ON_TRACK: "bg-ontrack-wash text-ontrack border-ontrack/45",
  BUSY: "bg-busy-wash text-busy border-busy/50",
  ACTION_REQUIRED: "bg-action-wash text-action border-action/50",
};

/** Dash for blanks so an unentered value never reads as zero. */
const num = (value: number | null) => (value === null ? "—" : value.toLocaleString("en-AU"));

export default async function HistoryPage() {
  if (!(await isAdminAuthenticated())) {
    return <AdminLogin />;
  }

  // Everyone who gets this far is signed in, so the edit links always show.
  const records = await listDashboards();
  const isAdmin = true;

  return (
    <div className="tcs-stage min-h-screen">
      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-6 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-deep">
              THE CELEBRATION SOCIETY
            </p>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Dashboard history
            </h1>
            <p className="mt-1.5 text-ink-muted">Previously published warehouse days</p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-rule px-4 py-2.5 text-sm font-semibold text-ink-muted transition hover:border-gold/50 hover:text-ink"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Display
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-6">
        {records.length === 0 ? (
          <p className="tcs-panel rounded-3xl p-10 text-center text-ink-muted">
            No dashboards have been published yet.{" "}
            <Link href="/admin" className="font-semibold text-gold-deep underline underline-offset-4">
              Publish today&rsquo;s
            </Link>
          </p>
        ) : (
          <div className="tcs-panel overflow-x-auto rounded-3xl">
            <table className="w-full min-w-[56rem] border-collapse text-left">
              <caption className="sr-only">
                Previously published warehouse dashboards, newest first
              </caption>
              <thead>
                <tr className="border-b border-rule text-xs uppercase tracking-[0.15em] text-ink-faint">
                  <th scope="col" className="px-5 py-4 font-semibold">Date</th>
                  <th scope="col" className="px-5 py-4 font-semibold">Personalising</th>
                  <th scope="col" className="px-5 py-4 font-semibold">Shipping</th>
                  <th scope="col" className="px-5 py-4 text-right font-semibold">Pers. orders</th>
                  <th scope="col" className="px-5 py-4 text-right font-semibold">Ship orders</th>
                  <th scope="col" className="px-5 py-4 text-right font-semibold">Express</th>
                  <th scope="col" className="px-5 py-4 text-right font-semibold">Redos</th>
                  <th scope="col" className="px-5 py-4 font-semibold">Status</th>
                  {isAdmin ? <th scope="col" className="px-5 py-4 font-semibold">Edit</th> : null}
                </tr>
              </thead>
              <tbody>
                {records.map((record) => {
                  const status = (STATUS_LABELS[record.overallStatus as OverallStatus]
                    ? record.overallStatus
                    : "ON_TRACK") as OverallStatus;
                  return (
                    <tr
                      key={record.id}
                      className="border-b border-rule-soft last:border-0 hover:bg-surface-sunk"
                    >
                      <th scope="row" className="whitespace-nowrap px-5 py-4 font-semibold text-ink">
                        {formatShortDate(record.dashboardDate)}
                      </th>
                      <td className="whitespace-nowrap px-5 py-4 text-ink-muted">
                        {record.personalisingOrderDate
                          ? formatBatchDate(record.personalisingOrderDate)
                          : "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-ink-muted">
                        {record.shippingOrderDate ? formatBatchDate(record.shippingOrderDate) : "—"}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-ink-soft">
                        {num(record.personalisedOrderCount)}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-ink-soft">
                        {num(record.shippingOrderCount)}
                      </td>
                      <td className="px-5 py-4 text-right text-ink-soft">
                        {num(record.expressCount)}
                      </td>
                      <td className="px-5 py-4 text-right text-ink-soft">
                        {num(record.redoCount)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold tracking-wide ${STATUS_PILL[status]}`}
                        >
                          {STATUS_LABELS[status]}
                        </span>
                      </td>
                      {isAdmin ? (
                        <td className="px-5 py-4">
                          <Link
                            href={`/admin?date=${record.dashboardDate}`}
                            className="inline-flex items-center gap-2 text-sm font-semibold text-gold-deep underline-offset-4 hover:underline"
                          >
                            <PencilLine className="size-4" aria-hidden="true" />
                            Open
                          </Link>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
