/**
 * Validation rules for saving a dashboard.
 *
 * This module is imported by BOTH the browser form and the API route, so the
 * two can never drift apart: whatever the client accepts, the server enforces
 * again. Never trust the client-side pass on its own — the API route always
 * re-validates.
 */
import { z } from "zod";
import { isValidDateKey, isValidTime } from "@/lib/dates";
import { NOTE_KINDS, OVERALL_STATUSES } from "./types";

/** Counts: whole numbers, never negative, and blank means "not entered". */
const optionalCount = z
  .union([z.number(), z.string()])
  .nullish()
  .transform((value) => {
    // Empty inputs arrive as "" from the form and mean "no value", not zero.
    if (value === null || value === undefined || value === "") return null;
    return typeof value === "number" ? value : Number(value);
  })
  .refine((value) => value === null || Number.isFinite(value), {
    message: "Must be a number",
  })
  .refine((value) => value === null || Number.isInteger(value), {
    message: "Must be a whole number",
  })
  .refine((value) => value === null || value >= 0, {
    message: "Cannot be negative",
  })
  .refine((value) => value === null || value <= 1_000_000, {
    message: "That looks too large — please check",
  });

const optionalDateKey = z
  .string()
  .nullish()
  .transform((value) => (value === null || value === undefined || value === "" ? null : value))
  .refine((value) => value === null || isValidDateKey(value), {
    message: "Enter a valid date",
  });

const optionalTime = z
  .string()
  .nullish()
  .transform((value) => (value === null || value === undefined || value === "" ? null : value))
  .refine((value) => value === null || isValidTime(value), {
    message: "Enter a valid time",
  });

/** Trim text, treat blank as null, and cap length so the board stays readable. */
const optionalText = (max: number, label: string) =>
  z
    .string()
    .nullish()
    .transform((value) => {
      if (value === null || value === undefined) return null;
      const trimmed = value.trim();
      return trimmed === "" ? null : trimmed;
    })
    .refine((value) => value === null || value.length <= max, {
      message: `${label} must be ${max} characters or fewer`,
    });

export const saveDashboardSchema = z.object({
  /** Required: which warehouse day this is. */
  dashboardDate: z
    .string()
    .refine((value) => isValidDateKey(value), { message: "Enter a valid dashboard date" }),

  overallStatus: z.enum(OVERALL_STATUSES),

  personalisingOrderDate: optionalDateKey,
  personalisedOrderCount: optionalCount,
  personalisedItemCount: optionalCount,
  nonPersonalisedOrderCount: optionalCount,

  shippingOrderDate: optionalDateKey,
  shippingOrderCount: optionalCount,
  shippingItemCount: optionalCount,
  courierCutoff: optionalTime,

  expressCount: optionalCount,
  priorityCount: optionalCount,
  redoCount: optionalCount,
  onHoldCount: optionalCount,

  // Generous limits — the heads-up is a real communication channel, but the
  // board still has to be readable from across the warehouse.
  dailyMessage: optionalText(600, "Today's heads up"),
  secondaryMessage: optionalText(400, "The secondary note"),
  updatedBy: optionalText(60, "Your name"),

  /**
   * Today's roster. Rows with neither a name nor a role are dropped rather than
   * rejected — the form always renders a blank row to type into, and an empty
   * one should never block a publish.
   */
  staff: z
    .array(
      z.object({
        name: z.string().max(40, "Name is too long").default(""),
        role: z.string().max(40, "Role is too long").default(""),
      }),
    )
    .max(24, "That is a lot of people — please check")
    .default([])
    .transform((rows) =>
      rows
        .map((row) => ({ name: row.name.trim(), role: row.role.trim() }))
        .filter((row) => row.name !== "" || row.role !== ""),
    )
    .refine((rows) => rows.every((row) => row.name !== ""), {
      message: "Every person needs a name",
    }),
});

export type SaveDashboardInput = z.input<typeof saveDashboardSchema>;
export type SaveDashboardData = z.output<typeof saveDashboardSchema>;

/**
 * A check-in during the day. Counts are cumulative totals so far, and both are
 * optional — someone doing a quick personalisation count at 9 AM should not be
 * forced to count the shipping bench too.
 */
export const saveCheckpointSchema = z.object({
  checkpointId: z.string().min(1, "Missing checkpoint"),
  personalisedComplete: optionalCount,
  shippedComplete: optionalCount,
  note: optionalText(240, "The check-in note"),
});

export type SaveCheckpointData = z.output<typeof saveCheckpointSchema>;

/** A note added during the day. */
export const addNoteSchema = z.object({
  dashboardDate: z
    .string()
    .refine((value) => isValidDateKey(value), { message: "Enter a valid date" }),
  kind: z.enum(NOTE_KINDS),
  body: z
    .string()
    .trim()
    .min(1, "Write something first")
    .max(240, "Keep it under 240 characters so it stays readable on the screen"),
});

export type AddNoteData = z.output<typeof addNoteSchema>;

/** Field-keyed errors, ready to render beside each input. */
export type FieldErrors = Partial<Record<keyof SaveDashboardData | "form", string>>;

/** Flatten a Zod error into the shape the admin form renders. */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = (issue.path[0] as keyof SaveDashboardData) ?? "form";
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}
