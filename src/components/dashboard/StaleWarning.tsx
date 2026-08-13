import { AlertTriangle } from "lucide-react";

/**
 * Shown when the board has not been published today (Sydney).
 *
 * Deliberately unmissable but not alarming — amber, not red, because the
 * numbers below may still be perfectly usable. Red is reserved for a genuine
 * ACTION REQUIRED status so it keeps its meaning.
 */
export function StaleWarning() {
  return (
    <div
      role="status"
      className="flex shrink-0 items-center gap-4 rounded-2xl border border-busy/50 bg-busy-wash px-5 py-3"
    >
      <AlertTriangle className="size-6 shrink-0 text-busy lg:size-7" aria-hidden="true" />
      <p className="tcs-eyebrow text-panel-label leading-tight text-busy">
        DASHBOARD HAS NOT BEEN UPDATED TODAY
        <span className="ml-3 hidden font-normal normal-case tracking-normal text-ink-soft xl:inline">
          The figures below are from the last published day — please check with the office before
          relying on them.
        </span>
      </p>
    </div>
  );
}
