/**
 * The dashboard DISPLAY MODEL.
 *
 * ARCHITECTURAL BOUNDARY — please read before changing.
 * ------------------------------------------------------
 * UI components consume `DashboardView` and nothing else. They never import
 * Prisma, never touch `process.env`, and never see a raw database row.
 *
 * That boundary is what makes the future Shopify work cheap: when order counts
 * start arriving from Shopify instead of a human, only the *assembler*
 * (src/lib/dashboard/service.ts -> toDashboardView) changes. Every component
 * keeps rendering the same shape, so no screen has to be redesigned.
 *
 * The `source` marker on each metric is the hook for that. Today everything is
 * "MANUAL". Later, Shopify-fed metrics will say "SHOPIFY" and the display can
 * — if we ever want it to — show a small automated/live indicator. Adding the
 * field now means the eventual change is additive rather than a refactor.
 */

/** Where a value came from. Room for Shopify without changing any component. */
export type MetricSource = "MANUAL" | "SHOPIFY";

/** Allowed overall warehouse states. */
export const OVERALL_STATUSES = ["ON_TRACK", "BUSY", "ACTION_REQUIRED"] as const;
export type OverallStatus = (typeof OVERALL_STATUSES)[number];

/** Kinds of note that can be added during the day. */
export const NOTE_KINDS = ["NOTE", "STOCK_LOW", "STOCK_EXPECTED"] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];

/** A single big number on the board. `value` is null when not entered. */
export type Metric = {
  /** Short label shown under the number, e.g. "PERSONALISED ITEMS". */
  label: string;
  value: number | null;
  source: MetricSource;
};

/** Exception cards: express / priority / redos / on hold. */
export type ExceptionKey = "express" | "priority" | "redos" | "onHold";

export type ExceptionMetric = Metric & {
  key: ExceptionKey;
  /**
   * How loudly this card should shout when the value is above zero.
   * "notice" = gold (express, priority), "warn" = red (redos, on hold).
   * Zero/blank always renders muted regardless of tone.
   */
  tone: "notice" | "warn";
};

/**
 * How today's progress compares to how much of the working day has gone.
 * Always paired with a word and an icon on screen — never colour alone.
 */
export type PaceState = "AHEAD" | "ON_PACE" | "BEHIND" | "COMPLETE" | "UNKNOWN";

/**
 * A progress meter: how much of the day's target is done.
 *
 * This is a "single ratio against a limit", so it renders as a meter with a
 * pace marker — not a pie. A two-slice pie cannot show where we *should* be,
 * which is the whole question the warehouse is asking.
 */
export type ProgressView = {
  /** The day's target, fixed each morning. Null when not set. */
  target: number | null;
  /** Cumulative completed, from the most recent recorded checkpoint. */
  done: number | null;
  /** 0–100, clamped. Null when there is no target to measure against. */
  percentComplete: number | null;
  /**
   * 0–100 — how far through the working day we are right now. The meter draws
   * this as a marker on the track, so "are we keeping up?" is a glance.
   */
  percentOfDayElapsed: number;
  pace: PaceState;
  /** Signed orders ahead of / behind the expected pace. Null when unknown. */
  variance: number | null;
  /** How many more to hit the target. Null when unknown. */
  remaining: number | null;
};

/** One check-in point in the day. */
export type CheckpointView = {
  id: string;
  /** "9 AM REPORT" */
  label: string;
  /** "9:00 AM" — pre-formatted. */
  timeLabel: string;
  /** Cumulative totals at this point; null when not recorded yet. */
  personalisedComplete: number | null;
  shippedComplete: number | null;
  /** Gain since the previous recorded checkpoint — the "win" to celebrate. */
  personalisedGain: number | null;
  shippedGain: number | null;
  note: string | null;
  /** False when this check-in is still to come. */
  isRecorded: boolean;
  /** True for the most recently recorded checkpoint. */
  isLatest: boolean;
};

/** A timestamped note added during the day. */
export type NoteView = {
  id: string;
  kind: NoteKind;
  body: string;
  /** "11:40 AM" in Sydney. */
  timeLabel: string;
};

/** Someone rostered on today. */
export type StaffView = {
  id: string;
  name: string;
  role: string;
};

export type ProductionPanelView = {
  /** Pre-formatted for display, e.g. "12 AUGUST". Null when not set. */
  batchDateLabel: string | null;
  progress: ProgressView;
  metrics: Metric[];
};

export type ShippingPanelView = {
  batchDateLabel: string | null;
  progress: ProgressView;
  metrics: Metric[];
  /** Pre-formatted, e.g. "2:30 PM". Null when not set. */
  courierCutoffLabel: string | null;
};

export type DashboardView = {
  /** Sydney "YYYY-MM-DD" this view describes. */
  dateKey: string;
  /** "THURSDAY 13 AUGUST 2026" */
  fullDateLabel: string;
  /** Sleeps until Christmas — 0 means today is Christmas Day. */
  sleepsToChristmas: number;

  /**
   * False when no admin has published for this date. The display shows its
   * empty state, but still renders the date and countdown.
   */
  isPublished: boolean;
  /**
   * True when the record exists but was last saved on an earlier date, i.e.
   * nobody has updated the board today. Drives the "NOT UPDATED TODAY" warning.
   */
  isStale: boolean;

  status: OverallStatus;
  production: ProductionPanelView;
  shipping: ShippingPanelView;
  exceptions: ExceptionMetric[];

  checkpoints: CheckpointView[];
  notes: NoteView[];
  staff: StaffView[];

  dailyMessage: string | null;
  secondaryMessage: string | null;
  updatedBy: string | null;
  /** "8:07 AM" in Sydney time, or null when never saved. */
  lastUpdatedLabel: string | null;
  /**
   * The day the record was actually saved, e.g. "12 AUGUST". Shown only when
   * the board is stale — a bare time with no date reads as "just now", which
   * is exactly the wrong impression on a day nobody has published.
   */
  lastUpdatedDayLabel: string | null;
  /** ISO instant — used by the client poller to detect a change cheaply. */
  updatedAtIso: string | null;
};

/** Human-facing copy for each status. Kept here so UI and admin agree. */
export const STATUS_LABELS: Record<OverallStatus, string> = {
  ON_TRACK: "ON TRACK",
  BUSY: "BUSY DAY",
  ACTION_REQUIRED: "ACTION REQUIRED",
};

export const PACE_LABELS: Record<PaceState, string> = {
  AHEAD: "AHEAD OF PACE",
  ON_PACE: "ON PACE",
  BEHIND: "BEHIND PACE",
  COMPLETE: "COMPLETE",
  UNKNOWN: "NO TARGET SET",
};

export const NOTE_KIND_LABELS: Record<NoteKind, string> = {
  NOTE: "HEADS UP",
  STOCK_LOW: "LOW STOCK",
  STOCK_EXPECTED: "STOCK EXPECTED",
};

/**
 * The working day used for pace. Change these two if the shift moves — every
 * pace calculation on the board reads from here.
 */
export const PRODUCTION_DAY = { startTime: "08:00", endTime: "16:00" } as const;

/** The check-ins created for every new day. */
export const DEFAULT_CHECKPOINTS = [
  { label: "9 AM REPORT", scheduledTime: "09:00" },
  { label: "12 PM CHECK-IN", scheduledTime: "12:00" },
  { label: "3 PM CHECK-IN", scheduledTime: "15:00" },
] as const;
