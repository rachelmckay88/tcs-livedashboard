/**
 * Dashboard service — the ONLY module that talks to the database.
 *
 * Everything above this layer (pages, components, API routes) works with the
 * `DashboardView` display model. That means the eventual Shopify integration
 * has exactly one place to plug in: `toDashboardView` below. See
 * docs/SHOPIFY-INTEGRATION.md.
 */
import type { DailyDashboard, DashboardCheckpoint, DashboardNote, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  formatBatchDate,
  formatFullDate,
  formatSydneyTime,
  formatTime,
  minutesFromTime,
  sleepsUntilChristmas,
  sydneyMinutesOfDay,
  toSydneyDateKey,
  todaySydneyDateKey,
} from "@/lib/dates";
import type {
  CheckpointView,
  DashboardView,
  ExceptionMetric,
  Metric,
  NoteKind,
  NoteView,
  OverallStatus,
  PaceState,
  ProgressView,
  StaffView,
} from "./types";
import {
  DEFAULT_CHECKPOINTS,
  NOTE_KINDS,
  OVERALL_STATUSES,
  PRODUCTION_DAY,
} from "./types";
import { saveDashboardSchema, type SaveDashboardData } from "./schema";

/**
 * Everything the display needs for one day, fetched in a single query.
 * `satisfies` (rather than `as const`) keeps Prisma's inference intact — an
 * `as const` here turns the orderBy arrays readonly and silently drops the
 * relations from the inferred result type.
 */
const fullInclude = {
  checkpoints: { orderBy: { scheduledTime: "asc" } },
  notes: { orderBy: { createdAt: "desc" } },
  staff: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
} satisfies Prisma.DailyDashboardInclude;

export type FullDashboard = Prisma.DailyDashboardGetPayload<{ include: typeof fullInclude }>;

/** Narrow the free-text status column back to the union, defensively. */
function coerceStatus(value: string): OverallStatus {
  return (OVERALL_STATUSES as readonly string[]).includes(value)
    ? (value as OverallStatus)
    : "ON_TRACK";
}

function coerceNoteKind(value: string): NoteKind {
  return (NOTE_KINDS as readonly string[]).includes(value) ? (value as NoteKind) : "NOTE";
}

/**
 * How far through the working day we are, 0–100.
 * Before the shift starts this is 0; after it ends, 100.
 */
function percentOfDayElapsed(now = new Date()): number {
  const start = minutesFromTime(PRODUCTION_DAY.startTime) ?? 0;
  const end = minutesFromTime(PRODUCTION_DAY.endTime) ?? 24 * 60;
  const current = sydneyMinutesOfDay(now);
  if (end <= start) return 0;
  return Math.min(100, Math.max(0, ((current - start) / (end - start)) * 100));
}

/**
 * Build a progress meter from a fixed target and the latest recorded count.
 *
 * The pace comparison is deliberately forgiving: a 5-point band around the
 * expected line counts as "on pace". Warehouse work is lumpy — a board that
 * flips to BEHIND because the 10am count is two orders light would be noise,
 * and the team would learn to ignore it.
 */
function buildProgress(
  target: number | null,
  done: number | null,
  dayElapsed: number,
): ProgressView {
  if (target === null || target <= 0) {
    return {
      target,
      done,
      percentComplete: null,
      percentOfDayElapsed: dayElapsed,
      pace: "UNKNOWN",
      variance: null,
      remaining: null,
    };
  }

  const completed = done ?? 0;
  const percentComplete = Math.min(100, Math.max(0, (completed / target) * 100));
  const expected = (target * dayElapsed) / 100;
  const variance = Math.round(completed - expected);

  let pace: PaceState;
  if (completed >= target) {
    pace = "COMPLETE";
  } else if (percentComplete >= dayElapsed + 5) {
    pace = "AHEAD";
  } else if (percentComplete <= dayElapsed - 5) {
    pace = "BEHIND";
  } else {
    pace = "ON_PACE";
  }

  return {
    target,
    done,
    percentComplete,
    percentOfDayElapsed: dayElapsed,
    pace,
    variance,
    remaining: Math.max(0, target - completed),
  };
}

/**
 * Turn stored checkpoints into display rows, computing each one's gain over the
 * previous recorded checkpoint. The gain is the number worth celebrating —
 * "+94 since 9 AM" is the little win the board is meant to surface.
 */
function buildCheckpoints(checkpoints: DashboardCheckpoint[]): CheckpointView[] {
  const ordered = [...checkpoints].sort((a, b) =>
    a.scheduledTime.localeCompare(b.scheduledTime),
  );

  let previousPersonalised: number | null = null;
  let previousShipped: number | null = null;
  let latestRecordedId: string | null = null;
  for (const checkpoint of ordered) {
    if (checkpoint.recordedAt) latestRecordedId = checkpoint.id;
  }

  return ordered.map((checkpoint) => {
    const isRecorded = checkpoint.recordedAt !== null;

    const personalisedGain =
      isRecorded && checkpoint.personalisedComplete !== null
        ? checkpoint.personalisedComplete - (previousPersonalised ?? 0)
        : null;
    const shippedGain =
      isRecorded && checkpoint.shippedComplete !== null
        ? checkpoint.shippedComplete - (previousShipped ?? 0)
        : null;

    if (isRecorded && checkpoint.personalisedComplete !== null) {
      previousPersonalised = checkpoint.personalisedComplete;
    }
    if (isRecorded && checkpoint.shippedComplete !== null) {
      previousShipped = checkpoint.shippedComplete;
    }

    return {
      id: checkpoint.id,
      label: checkpoint.label,
      timeLabel: formatTime(checkpoint.scheduledTime) ?? checkpoint.scheduledTime,
      personalisedComplete: checkpoint.personalisedComplete,
      shippedComplete: checkpoint.shippedComplete,
      personalisedGain,
      shippedGain,
      note: checkpoint.note,
      isRecorded,
      isLatest: checkpoint.id === latestRecordedId,
    };
  });
}

/** Latest recorded cumulative value for one of the two progress measures. */
function latestRecorded(
  checkpoints: DashboardCheckpoint[],
  field: "personalisedComplete" | "shippedComplete",
): number | null {
  const recorded = checkpoints
    .filter((checkpoint) => checkpoint.recordedAt && checkpoint[field] !== null)
    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  return recorded.length > 0 ? recorded[recorded.length - 1][field] : null;
}

/**
 * Build the display model from a stored record.
 *
 * ===========================================================================
 * FUTURE SHOPIFY INTEGRATION POINT
 * ===========================================================================
 * This function is the seam. Today every metric is sourced "MANUAL" from the
 * record the morning admin published. When Shopify is wired up, the intended
 * shape is:
 *
 *   const shopify = await getShopifyCounts(record.personalisingOrderDate);
 *   //  ^ src/lib/shopify/service.ts — returns null when disabled/unreachable
 *
 *   value:  record.personalisedOrderCount ?? shopify?.personalisedOrders ?? null
 *   source: record.personalisedOrderCount != null ? "MANUAL" : "SHOPIFY"
 *
 * i.e. a manually entered number always wins (human operational truth), and
 * Shopify only fills the gaps. No component changes — they already render
 * `Metric`. Keep this function the single place that decides precedence.
 *
 * Checkpoint progress counts should stay MANUAL even after Shopify lands:
 * "how many have we finished personalising" is a floor count, not an order
 * attribute Shopify knows about.
 * ===========================================================================
 */
export function toDashboardView(
  record: FullDashboard | null,
  dateKey: string,
  now: Date = new Date(),
): DashboardView {
  const dayElapsed = percentOfDayElapsed(now);

  const base = {
    dateKey,
    fullDateLabel: formatFullDate(dateKey),
    sleepsToChristmas: sleepsUntilChristmas(dateKey),
  };

  if (!record) {
    // First-use / not-yet-published: the board must still show the date and
    // countdown rather than crashing or implying zero orders.
    return {
      ...base,
      isPublished: false,
      isStale: false,
      status: "ON_TRACK",
      production: {
        batchDateLabel: null,
        progress: buildProgress(null, null, dayElapsed),
        metrics: [],
      },
      shipping: {
        batchDateLabel: null,
        progress: buildProgress(null, null, dayElapsed),
        metrics: [],
        courierCutoffLabel: null,
      },
      exceptions: emptyExceptions(),
      checkpoints: [],
      notes: [],
      staff: [],
      dailyMessage: null,
      secondaryMessage: null,
      updatedBy: null,
      lastUpdatedLabel: null,
      lastUpdatedDayLabel: null,
      updatedAtIso: null,
    };
  }

  // "Stale" = the record was last saved before today (Sydney). This is how the
  // board warns that it may be showing yesterday's instructions.
  const savedOnDateKey = toSydneyDateKey(record.updatedAt);
  const isStale = savedOnDateKey !== todaySydneyDateKey();

  const production: Metric[] = compactMetrics([
    { label: "PERSONALISED ITEMS", value: record.personalisedItemCount, source: "MANUAL" },
    { label: "NON-PERSONALISED ORDERS", value: record.nonPersonalisedOrderCount, source: "MANUAL" },
  ]);

  const shipping: Metric[] = compactMetrics([
    { label: "ITEMS", value: record.shippingItemCount, source: "MANUAL" },
  ]);

  return {
    ...base,
    isPublished: record.isPublished,
    isStale,
    status: coerceStatus(record.overallStatus),
    production: {
      batchDateLabel: record.personalisingOrderDate
        ? formatBatchDate(record.personalisingOrderDate)
        : null,
      progress: buildProgress(
        record.personalisedOrderCount,
        latestRecorded(record.checkpoints, "personalisedComplete"),
        dayElapsed,
      ),
      metrics: production,
    },
    shipping: {
      batchDateLabel: record.shippingOrderDate ? formatBatchDate(record.shippingOrderDate) : null,
      progress: buildProgress(
        record.shippingOrderCount,
        latestRecorded(record.checkpoints, "shippedComplete"),
        dayElapsed,
      ),
      metrics: shipping,
      courierCutoffLabel: formatTime(record.courierCutoff),
    },
    exceptions: [
      { key: "express", label: "EXPRESS", value: record.expressCount, source: "MANUAL", tone: "notice" },
      { key: "priority", label: "PRIORITY", value: record.priorityCount, source: "MANUAL", tone: "notice" },
      { key: "redos", label: "REDOS", value: record.redoCount, source: "MANUAL", tone: "warn" },
      { key: "onHold", label: "ON HOLD", value: record.onHoldCount, source: "MANUAL", tone: "warn" },
    ],
    checkpoints: buildCheckpoints(record.checkpoints),
    notes: record.notes.map(
      (note): NoteView => ({
        id: note.id,
        kind: coerceNoteKind(note.kind),
        body: note.body,
        timeLabel: formatSydneyTime(note.createdAt),
      }),
    ),
    staff: record.staff.map(
      (member): StaffView => ({ id: member.id, name: member.name, role: member.role }),
    ),
    dailyMessage: record.dailyMessage,
    secondaryMessage: record.secondaryMessage,
    updatedBy: record.updatedBy,
    lastUpdatedLabel: formatSydneyTime(record.updatedAt),
    lastUpdatedDayLabel: formatBatchDate(savedOnDateKey),
    updatedAtIso: record.updatedAt.toISOString(),
  };
}

/** Drop metrics with no value so the panel never renders an empty slot. */
function compactMetrics(metrics: Metric[]): Metric[] {
  return metrics.filter((metric) => metric.value !== null && metric.value !== undefined);
}

function emptyExceptions(): ExceptionMetric[] {
  return [
    { key: "express", label: "EXPRESS", value: null, source: "MANUAL", tone: "notice" },
    { key: "priority", label: "PRIORITY", value: null, source: "MANUAL", tone: "notice" },
    { key: "redos", label: "REDOS", value: null, source: "MANUAL", tone: "warn" },
    { key: "onHold", label: "ON HOLD", value: null, source: "MANUAL", tone: "warn" },
  ];
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** The raw record for a Sydney date, or null. Used by the admin form. */
export async function getDashboardRecordByDate(dateKey: string): Promise<FullDashboard | null> {
  return prisma.dailyDashboard.findUnique({
    where: { dashboardDate: dateKey },
    include: fullInclude,
  });
}

/** Display model for a specific Sydney date. */
export async function getDashboardByDate(dateKey: string): Promise<DashboardView> {
  const record = await getDashboardRecordByDate(dateKey);
  return toDashboardView(record, dateKey);
}

/**
 * Display model for today (Sydney).
 *
 * If today has not been published, this deliberately falls back to the most
 * recent published day so the warehouse still sees real batch numbers — paired
 * with `isStale`, which makes the board show a clear "NOT UPDATED TODAY"
 * warning. Showing yesterday's data with a loud warning is more useful to the
 * floor than showing nothing at all.
 */
export async function getTodayDashboard(): Promise<DashboardView> {
  const dateKey = todaySydneyDateKey();
  const today = await getDashboardRecordByDate(dateKey);

  if (today?.isPublished) {
    return toDashboardView(today, dateKey);
  }

  const mostRecent = await prisma.dailyDashboard.findFirst({
    where: { isPublished: true, dashboardDate: { lt: dateKey } },
    orderBy: { dashboardDate: "desc" },
    include: fullInclude,
  });

  if (!mostRecent) {
    // Genuinely nothing has ever been published — true empty state.
    return toDashboardView(null, dateKey);
  }

  // Render the older record, but headline TODAY's date and countdown so the
  // date on the wall is never wrong.
  return { ...toDashboardView(mostRecent, dateKey), isStale: true };
}

/** Recent days, newest first — for /history. */
export async function listDashboards(limit = 60): Promise<DailyDashboard[]> {
  return prisma.dailyDashboard.findMany({
    where: { isPublished: true },
    orderBy: { dashboardDate: "desc" },
    take: limit,
  });
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Create or update the row for `dashboardDate` and mark it published.
 *
 * Upsert keyed on the date means the admin never has to "create today's
 * record" — opening /admin and pressing Publish is always the right move,
 * whether it is the first save of the day or the fifth.
 *
 * Staff are replaced wholesale on each save (the roster is small and edited as
 * a list). Checkpoints are created once and never clobbered here, so a morning
 * re-publish can't wipe progress already recorded during the day.
 */
export async function saveDashboard(input: SaveDashboardData): Promise<FullDashboard> {
  const { dashboardDate, staff, ...fields } = input;

  const saved = await prisma.dailyDashboard.upsert({
    where: { dashboardDate },
    create: {
      dashboardDate,
      ...fields,
      isPublished: true,
      checkpoints: { create: DEFAULT_CHECKPOINTS.map((checkpoint) => ({ ...checkpoint })) },
    },
    update: { ...fields, isPublished: true },
  });

  // Backfill the default check-ins for any record created before this feature
  // existed, so an older day still gets a working timeline.
  const existingCheckpoints = await prisma.dashboardCheckpoint.count({
    where: { dashboardId: saved.id },
  });
  if (existingCheckpoints === 0) {
    await prisma.dashboardCheckpoint.createMany({
      data: DEFAULT_CHECKPOINTS.map((checkpoint) => ({ ...checkpoint, dashboardId: saved.id })),
    });
  }

  await prisma.staffAssignment.deleteMany({ where: { dashboardId: saved.id } });
  if (staff.length > 0) {
    await prisma.staffAssignment.createMany({
      data: staff.map((member, index) => ({
        dashboardId: saved.id,
        name: member.name,
        role: member.role,
        sortOrder: index,
      })),
    });
  }

  const withRelations = await prisma.dailyDashboard.findUniqueOrThrow({
    where: { id: saved.id },
    include: fullInclude,
  });
  return withRelations;
}

/**
 * Validate unknown input (from the API route) and save it.
 * Throws a ZodError the caller can convert to field errors.
 */
export async function validateAndSaveDashboard(payload: unknown): Promise<FullDashboard> {
  const data = saveDashboardSchema.parse(payload);
  return saveDashboard(data);
}

/**
 * Record a check-in: the cumulative counts at one point in the day.
 *
 * Stamping `recordedAt` is what flips the checkpoint from "still to come" to
 * "done" on the board, so it is set here rather than relying on updatedAt.
 */
export async function saveCheckpoint(input: {
  checkpointId: string;
  personalisedComplete: number | null;
  shippedComplete: number | null;
  note: string | null;
}): Promise<DashboardCheckpoint> {
  return prisma.dashboardCheckpoint.update({
    where: { id: input.checkpointId },
    data: {
      personalisedComplete: input.personalisedComplete,
      shippedComplete: input.shippedComplete,
      note: input.note,
      recordedAt: new Date(),
    },
  });
}

/** Add a timestamped note to a day (heads up / low stock / stock expected). */
export async function addNote(input: {
  dashboardId: string;
  kind: NoteKind;
  body: string;
}): Promise<DashboardNote> {
  return prisma.dashboardNote.create({ data: input });
}

/** Remove a note once it is no longer relevant. */
export async function deleteNote(noteId: string): Promise<void> {
  await prisma.dashboardNote.delete({ where: { id: noteId } });
}
