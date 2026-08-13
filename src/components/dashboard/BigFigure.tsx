import type { Metric } from "@/lib/dashboard/types";

/**
 * A supporting number with its label underneath. Deliberately quieter than the
 * batch date and the progress meter — these are context, not the headline.
 */
export function BigFigure({ metric }: { metric: Metric }) {
  return (
    <div className="min-w-0">
      <div className="text-figure font-extrabold leading-[0.9] tracking-tight text-ink">
        {metric.value?.toLocaleString("en-AU")}
      </div>
      <div className="tcs-eyebrow-tight mt-1.5 text-metric-label leading-tight text-ink-muted">
        {metric.label}
      </div>
    </div>
  );
}
