import { AlertTriangle, CheckCircle2, Gauge } from "lucide-react";
import { STATUS_LABELS, type OverallStatus } from "@/lib/dashboard/types";

/**
 * The day's overall state.
 *
 * Accessibility: never colour alone — each state has a distinct icon AND
 * distinct wording, so it still reads correctly for colour-blind staff or on a
 * poorly calibrated warehouse TV.
 */
const STATUS_STYLES: Record<OverallStatus, { className: string; Icon: typeof CheckCircle2 }> = {
  ON_TRACK: { className: "bg-ontrack text-white", Icon: CheckCircle2 },
  BUSY: { className: "bg-busy text-white", Icon: Gauge },
  ACTION_REQUIRED: { className: "bg-action text-white", Icon: AlertTriangle },
};

export function StatusBadge({ status }: { status: OverallStatus }) {
  const { className, Icon } = STATUS_STYLES[status];

  return (
    <div className={`inline-flex items-center gap-2.5 rounded-full px-5 py-2 ${className}`}>
      <Icon className="size-[1.3em] shrink-0" aria-hidden="true" />
      <span className="tcs-eyebrow text-panel-label leading-none">{STATUS_LABELS[status]}</span>
    </div>
  );
}
