import { Check } from "lucide-react";
import type { CheckpointView } from "@/lib/dashboard/types";

/**
 * The day's check-ins: 9 AM, 12 PM, 3 PM.
 *
 * Shows the cumulative count at each point and, more importantly, the GAIN
 * since the last one — "+94" is the little win the team is meant to see. Points
 * still to come stay on the strip in outline, so the shape of the day is
 * visible from the first check-in onwards.
 *
 * Three points is too few to deserve a line chart; a labelled strip is more
 * readable at distance and does not pretend to a precision the data lacks.
 */
export function CheckpointTimeline({
  checkpoints,
  field,
}: {
  checkpoints: CheckpointView[];
  /** Which measure this strip is reporting. */
  field: "personalised" | "shipped";
}) {
  if (checkpoints.length === 0) return null;

  return (
    <ol className="flex items-stretch gap-2">
      {checkpoints.map((checkpoint) => {
        const value =
          field === "personalised" ? checkpoint.personalisedComplete : checkpoint.shippedComplete;
        const gain =
          field === "personalised" ? checkpoint.personalisedGain : checkpoint.shippedGain;
        const isDone = checkpoint.isRecorded && value !== null;

        return (
          <li
            key={checkpoint.id}
            className={`flex-1 rounded-xl border px-3 py-2 ${
              isDone
                ? checkpoint.isLatest
                  ? "border-gold bg-gold-wash"
                  : "border-rule bg-surface-sunk"
                : "border-dashed border-rule bg-transparent"
            }`}
          >
            <p className="flex items-center gap-1 text-[0.68em] font-semibold uppercase tracking-wider text-ink-muted">
              {isDone ? (
                <Check className="size-[1.1em] shrink-0 text-ontrack" aria-hidden="true" />
              ) : null}
              {checkpoint.timeLabel}
            </p>

            {isDone ? (
              <p className="mt-0.5 flex items-baseline gap-1.5">
                <span className="text-metric-label font-bold leading-none text-ink lg:text-panel-label">
                  {value.toLocaleString("en-AU")}
                </span>
                {gain !== null && gain > 0 ? (
                  <span className="text-[0.7em] font-bold leading-none text-ontrack">
                    +{gain.toLocaleString("en-AU")}
                  </span>
                ) : null}
              </p>
            ) : (
              <p className="mt-0.5 text-metric-label leading-none text-ink-faint">To come</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
