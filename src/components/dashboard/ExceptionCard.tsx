import { PauseCircle, RotateCcw, Star, Zap } from "lucide-react";
import type { ExceptionKey, ExceptionMetric } from "@/lib/dashboard/types";

/**
 * Exception cards: EXPRESS / PRIORITY / REDOS / ON HOLD.
 *
 * Escalation rules:
 *   zero or blank -> muted. Present, but not competing for attention.
 *   express/priority above zero -> gold. "Notice this."
 *   redos/on hold above zero    -> red. "Deal with this."
 *
 * Zero cards stay on screen rather than disappearing, so the row keeps a
 * stable shape all day and the absence of a problem is itself visible.
 */
const ICONS: Record<ExceptionKey, typeof Zap> = {
  express: Zap,
  priority: Star,
  redos: RotateCcw,
  onHold: PauseCircle,
};

export function ExceptionCard({ exception }: { exception: ExceptionMetric }) {
  const Icon = ICONS[exception.key];
  const value = exception.value;
  const isActive = value !== null && value > 0;

  const tone = !isActive
    ? { card: "border-rule bg-surface", icon: "text-ink-faint", value: "text-ink-faint", label: "text-ink-muted" }
    : exception.tone === "notice"
      ? { card: "border-gold/55 bg-gold-wash", icon: "text-gold-deep", value: "text-gold-deep", label: "text-ink-soft" }
      : { card: "border-action/45 bg-action-wash", icon: "text-action", value: "text-action", label: "text-ink-soft" };

  return (
    <div className={`flex items-center gap-4 rounded-2xl border p-4 lg:gap-5 lg:p-5 ${tone.card}`}>
      <Icon className={`size-6 shrink-0 lg:size-8 ${tone.icon}`} aria-hidden="true" />
      <div className="min-w-0">
        <div className={`text-exception font-extrabold leading-[0.9] tracking-tight ${tone.value}`}>
          {/* An unentered value shows an em-dash, never a misleading 0. */}
          {value === null ? "—" : value.toLocaleString("en-AU")}
        </div>
        <div className={`tcs-eyebrow-tight mt-1.5 text-metric-label leading-tight ${tone.label}`}>
          {exception.label}
        </div>
      </div>
    </div>
  );
}
