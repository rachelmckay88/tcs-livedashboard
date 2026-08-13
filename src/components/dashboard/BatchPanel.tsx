import type { ReactNode } from "react";
import { BigFigure } from "./BigFigure";
import { CheckpointTimeline } from "./CheckpointTimeline";
import { ProgressMeter } from "./ProgressMeter";
import type { CheckpointView, Metric, ProgressView } from "@/lib/dashboard/types";

/**
 * The two dominant panels — PERSONALISING TODAY and SHIPPING TODAY.
 *
 * Both share this shell so the pair reads as a matched set at a glance. The
 * order batch date is the visual anchor ("which day are we on?" is the question
 * the floor asks most), the meter answers "how are we going?", and the
 * checkpoint strip along the bottom shows the day building up.
 */
export function BatchPanel({
  title,
  Icon,
  batchDateLabel,
  progress,
  progressLabel,
  metrics,
  checkpoints,
  checkpointField,
  headerAccessory,
}: {
  title: string;
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  batchDateLabel: string | null;
  progress: ProgressView;
  progressLabel: string;
  metrics: Metric[];
  checkpoints: CheckpointView[];
  checkpointField: "personalised" | "shipped";
  /** Sits on the title row, right-aligned (the courier cut-off). */
  headerAccessory?: ReactNode;
}) {
  return (
    <section
      className="tcs-panel flex min-h-0 flex-col overflow-hidden rounded-2xl p-5 lg:p-6"
      aria-label={title}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Icon className="size-[1.15em] shrink-0 text-gold-deep" aria-hidden={true} />
        <h2 className="tcs-eyebrow text-panel-label leading-none text-ink">{title}</h2>
        {headerAccessory ? <div className="ml-auto shrink-0">{headerAccessory}</div> : null}
      </div>

      {/* Order batch date — the anchor of the panel */}
      <div className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <p className="tcs-eyebrow-tight text-eyebrow text-ink-muted">ORDERS FROM</p>
          <p
            className={`mt-1 text-batch font-extrabold leading-[0.88] tracking-tight ${
              batchDateLabel ? "text-ink" : "text-ink-faint"
            }`}
          >
            {batchDateLabel ?? "NOT SET"}
          </p>
        </div>

        {/* Secondary figures sit beside the date, so the meter below gets the
            full panel width. Blank values are filtered out upstream. */}
        {metrics.length > 0 ? (
          <div className="flex items-start gap-6 lg:gap-8">
            {metrics.map((metric) => (
              <BigFigure key={metric.label} metric={metric} />
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-auto pt-5">
        <ProgressMeter label={progressLabel} progress={progress} />
      </div>

      {checkpoints.length > 0 ? (
        <div className="mt-4 shrink-0">
          <CheckpointTimeline checkpoints={checkpoints} field={checkpointField} />
        </div>
      ) : null}
    </section>
  );
}
