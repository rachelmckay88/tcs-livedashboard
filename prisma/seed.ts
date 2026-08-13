/**
 * Development seed data.
 *
 * Run with:  npm run db:seed
 *
 * SAFETY
 * ------
 * This script refuses to run when NODE_ENV=production, and refuses to touch a
 * database that already contains published dashboards unless you pass --force.
 * Demo numbers on a warehouse TV would be worse than an empty screen, so the
 * seed must never be able to overwrite real operational data by accident.
 *
 * Dates are anchored relative to today (Sydney) rather than hard-coded, so the
 * seeded board is always "today" and demonstrates the real layout whenever you
 * run it. Values match the example data in the project brief.
 */
import { PrismaClient } from "@prisma/client";
import { addDaysToDateKey, minutesFromTime, sydneyMinutesOfDay, todaySydneyDateKey } from "../src/lib/dates";
import { DEFAULT_CHECKPOINTS, PRODUCTION_DAY } from "../src/lib/dashboard/types";

const prisma = new PrismaClient();
const force = process.argv.includes("--force");

/** How far through the working day a given "HH:mm" is, as a 0–1 fraction. */
function elapsedFractionAt(time: string): number {
  const start = minutesFromTime(PRODUCTION_DAY.startTime) ?? 0;
  const end = minutesFromTime(PRODUCTION_DAY.endTime) ?? 24 * 60;
  const at = minutesFromTime(time) ?? 0;
  if (end <= start) return 0;
  return Math.min(1, Math.max(0, (at - start) / (end - start)));
}

/**
 * Demo checkpoints that match the actual time of day.
 *
 * Without this the seeded board is a snapshot of some fixed hour, so running
 * the seed in the afternoon produces a screen that reads "badly behind" for no
 * real reason. Here, check-ins whose time has passed are filled in on a pace
 * that stays just ahead of the clock, so the demo looks like a plausible live
 * day whenever you happen to run it.
 */
function demoCheckpoints(personalisedTarget: number, shippedTarget: number, now: Date) {
  const nowFraction = Math.min(
    1,
    Math.max(0, (sydneyMinutesOfDay(now) - (minutesFromTime(PRODUCTION_DAY.startTime) ?? 0)) /
      (((minutesFromTime(PRODUCTION_DAY.endTime) ?? 0) - (minutesFromTime(PRODUCTION_DAY.startTime) ?? 0)) || 1)),
  );

  // Running slightly ahead of the clock reads as a good day.
  const doneFraction = Math.min(1, nowFraction + 0.06);

  const passed = DEFAULT_CHECKPOINTS.filter(
    (checkpoint) => nowFraction > 0 && elapsedFractionAt(checkpoint.scheduledTime) <= nowFraction,
  );
  const lastPassedTime = passed.length > 0 ? passed[passed.length - 1].scheduledTime : null;

  return DEFAULT_CHECKPOINTS.map((checkpoint) => {
    const at = elapsedFractionAt(checkpoint.scheduledTime);
    const hasPassed = nowFraction > 0 && at <= nowFraction;

    if (!hasPassed) {
      return { ...checkpoint, personalisedComplete: null, shippedComplete: null, note: null, recordedAt: null };
    }

    // The most recent check-in carries today's actual total; earlier ones are
    // scaled back by how far through the day they were, so the run climbs.
    const share =
      checkpoint.scheduledTime === lastPassedTime
        ? 1
        : Math.min(1, nowFraction === 0 ? 0 : at / nowFraction);

    return {
      ...checkpoint,
      personalisedComplete: Math.round(personalisedTarget * doneFraction * share),
      shippedComplete: Math.round(shippedTarget * doneFraction * share),
      note: checkpoint.scheduledTime === "12:00" ? "Engraver 2 back up and running." : null,
      recordedAt: now,
    };
  });
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Refusing to seed: NODE_ENV is production. Demo data must never reach the warehouse display.",
    );
  }

  const existing = await prisma.dailyDashboard.count({ where: { isPublished: true } });
  if (existing > 0 && !force) {
    console.log(
      `Found ${existing} published dashboard(s) already — leaving them alone.\n` +
        "Re-run with `npm run db:seed -- --force` if you really want to add demo data.",
    );
    return;
  }

  const today = todaySydneyDateKey();

  // Today: the fully populated example from the brief — a busy day.
  const todayRecord = {
    dashboardDate: today,
    personalisingOrderDate: addDaysToDateKey(today, -1),
    personalisedOrderCount: 186,
    personalisedItemCount: 273,
    nonPersonalisedOrderCount: 74,
    shippingOrderDate: addDaysToDateKey(today, -2),
    shippingOrderCount: 214,
    shippingItemCount: 296,
    courierCutoff: "14:30",
    expressCount: 12,
    priorityCount: 7,
    redoCount: 4,
    onHoldCount: 3,
    overallStatus: "BUSY",
    dailyMessage:
      "Complete express Santa sacks first. Red ribbon stock is running low.\nAustralia Post pickup is at 2pm — everything must be on the dock by 1:45.",
    secondaryMessage: "Do not pack the personalised stockings until the replacement stock arrives.",
    updatedBy: "Rachel",
    isPublished: true,
  };

  // A couple of earlier days so /history has something to show.
  const previousDays = [
    {
      dashboardDate: addDaysToDateKey(today, -1),
      personalisingOrderDate: addDaysToDateKey(today, -2),
      personalisedOrderCount: 152,
      personalisedItemCount: 221,
      nonPersonalisedOrderCount: 61,
      shippingOrderDate: addDaysToDateKey(today, -3),
      shippingOrderCount: 178,
      shippingItemCount: 244,
      courierCutoff: "14:30",
      expressCount: 8,
      priorityCount: 3,
      redoCount: 1,
      onHoldCount: 0,
      overallStatus: "ON_TRACK",
      dailyMessage: "Steady day. Focus on clearing the Tuesday personalisation backlog.",
      secondaryMessage: null,
      updatedBy: "Rachel",
      isPublished: true,
    },
    {
      dashboardDate: addDaysToDateKey(today, -2),
      personalisingOrderDate: addDaysToDateKey(today, -3),
      personalisedOrderCount: 203,
      personalisedItemCount: 312,
      nonPersonalisedOrderCount: 88,
      shippingOrderDate: addDaysToDateKey(today, -4),
      shippingOrderCount: 240,
      shippingItemCount: 331,
      courierCutoff: "14:00",
      expressCount: 19,
      priorityCount: 11,
      redoCount: 6,
      onHoldCount: 5,
      overallStatus: "ACTION_REQUIRED",
      dailyMessage:
        "Six redos must be finished before lunch. Engraving machine 2 is down — route everything through machine 1.",
      secondaryMessage: "Courier cut-off is 30 minutes earlier today.",
      updatedBy: "Sam",
      isPublished: true,
    },
  ];

  for (const record of [todayRecord, ...previousDays]) {
    const saved = await prisma.dailyDashboard.upsert({
      where: { dashboardDate: record.dashboardDate },
      create: record,
      update: record,
    });

    // Rebuild the day's relations so re-seeding is idempotent.
    await prisma.dashboardCheckpoint.deleteMany({ where: { dashboardId: saved.id } });
    await prisma.staffAssignment.deleteMany({ where: { dashboardId: saved.id } });
    await prisma.dashboardNote.deleteMany({ where: { dashboardId: saved.id } });

    const isToday = record.dashboardDate === today;

    // Today tracks the clock; past days are finished, so they show completed.
    const checkpoints = isToday
      ? demoCheckpoints(
          record.personalisedOrderCount ?? 0,
          record.shippingOrderCount ?? 0,
          new Date(),
        )
      : DEFAULT_CHECKPOINTS.map((checkpoint, index) => {
          const share = (index + 1) / DEFAULT_CHECKPOINTS.length;
          return {
            ...checkpoint,
            personalisedComplete: Math.round((record.personalisedOrderCount ?? 0) * share),
            shippedComplete: Math.round((record.shippingOrderCount ?? 0) * share),
            note: null,
            recordedAt: new Date(),
          };
        });

    await prisma.dashboardCheckpoint.createMany({
      data: checkpoints.map((checkpoint) => ({ ...checkpoint, dashboardId: saved.id })),
    });

    await prisma.staffAssignment.createMany({
      data: [
        { name: "Rachel", role: "Warehouse lead", sortOrder: 0 },
        { name: "Sam", role: "Personalisation", sortOrder: 1 },
        { name: "Mia", role: "Personalisation", sortOrder: 2 },
        { name: "Jordan", role: "Packing & dispatch", sortOrder: 3 },
        { name: "Ash", role: "Quality & redos", sortOrder: 4 },
      ].map((member) => ({ ...member, dashboardId: saved.id })),
    });

    if (isToday) {
      await prisma.dashboardNote.createMany({
        data: [
          { dashboardId: saved.id, kind: "STOCK_LOW", body: "Red ribbon down to two rolls — use gold on non-Christmas orders." },
          { dashboardId: saved.id, kind: "STOCK_EXPECTED", body: "Gold ribbon delivery arriving around 2pm." },
        ],
      });
    }
  }

  console.log(`Seeded ${previousDays.length + 1} demo dashboards (today: ${today}).`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
