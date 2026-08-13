import { Check, MoveRight, TrendingDown, TrendingUp } from "lucide-react";
import { PACE_LABELS, type PaceState, type ProgressView } from "@/lib/dashboard/types";

/**
 * "142 of 186 personalised" — a single ratio against a limit.
 *
 * WHY A METER AND NOT A PIE
 * A two-slice pie can show how much is done, but it cannot show where we
 * *should* be by now, which is the actual question ("are we on track?"). A
 * track can: the fill is progress, and the marker is how far through the
 * working day we are. Reading the gap between them is the whole job, and it
 * works from across the warehouse in a way pie wedges do not.
 */
const PACE_STYLES: Record<PaceState, { text: string; Icon: typeof Check }> = {
  AHEAD: { text: "text-ontrack", Icon: TrendingUp },
  ON_PACE: { text: "text-ink-soft", Icon: MoveRight },
  BEHIND: { text: "text-action", Icon: TrendingDown },
  COMPLETE: { text: "text-ontrack", Icon: Check },
  UNKNOWN: { text: "text-ink-faint", Icon: MoveRight },
};

export function ProgressMeter({
  label,
  progress,
}: {
  label: string;
  progress: ProgressView;
}) {
  const { target, done, percentComplete, percentOfDayElapsed, pace, remaining } = progress;

  // No target set — say so plainly rather than drawing an empty track that
  // looks like "nothing done yet".
  if (target === null || percentComplete === null) {
    return (
      <div>
        <p className="tcs-eyebrow-tight text-metric-label text-ink-muted">{label}</p>
        <p className="mt-2 text-metric-label text-ink-faint">No target set for today</p>
      </div>
    );
  }

  const { text: paceText, Icon: PaceIcon } = PACE_STYLES[pace];
  const completed = done ?? 0;
  const isComplete = pace === "COMPLETE";

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="tcs-eyebrow-tight text-metric-label text-ink-muted">{label}</p>
        {/* Pace never relies on colour: it always carries an icon and words. */}
        <p className={`flex items-center gap-1.5 text-metric-label font-bold ${paceText}`}>
          <PaceIcon className="size-[1.1em] shrink-0" aria-hidden="true" />
          {PACE_LABELS[pace]}
        </p>
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-4">
        <p className="text-progress font-bold leading-none tracking-tight text-ink">
          {completed.toLocaleString("en-AU")}
          <span className="text-ink-faint"> / {target.toLocaleString("en-AU")}</span>
        </p>
        <p
          className={`text-figure font-bold leading-none tracking-tight ${
            isComplete ? "text-ontrack" : "text-gold-deep"
          }`}
        >
          {Math.round(percentComplete)}%
        </p>
      </div>

      {/* The track. Recessive rail, one solid fill, and a marker for "now". */}
      <div className="relative mt-3">
        <div
          className="h-5 w-full overflow-hidden rounded-full bg-surface-sunk ring-1 ring-inset ring-rule lg:h-6"
          role="progressbar"
          aria-valuenow={Math.round(percentComplete)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label}: ${completed} of ${target} complete`}
        >
          <div
            className={`tcs-meter-fill h-full rounded-full ${
              isComplete ? "bg-ontrack" : "bg-gold-deep"
            }`}
            style={{ width: `${percentComplete}%` }}
          />
        </div>

        {/* Where we should be by now. Sits above the fill, not inside it, so it
            stays visible whether we are ahead or behind. Hidden once the target
            is met — pace stops mattering the moment the work is done. */}
        {!isComplete ? (
          <div
            className="pointer-events-none absolute -top-1 bottom-[-0.25rem] w-[3px] -translate-x-1/2 rounded-full bg-ink"
            style={{ left: `${percentOfDayElapsed}%` }}
            aria-hidden="true"
          />
        ) : null}
      </div>

      {/* Split across the track's width so each end sits under what it
          describes: work remaining on the left, the day's clock on the right,
          where the marker ends up as the afternoon goes on. */}
      <div className="mt-2 flex items-baseline justify-between gap-3 text-metric-label">
        {isComplete ? (
          <span className="font-semibold text-ontrack">Target reached — nice work</span>
        ) : (
          <span className="font-semibold text-ink-soft">
            {remaining?.toLocaleString("en-AU")} to go
          </span>
        )}
        {!isComplete ? (
          <span className="text-ink-faint">{Math.round(percentOfDayElapsed)}% of the day gone</span>
        ) : null}
      </div>
    </div>
  );
}
