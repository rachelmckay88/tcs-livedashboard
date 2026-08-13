"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Megaphone,
  PackagePlus,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { NOTE_KIND_LABELS, NOTE_KINDS, type CheckpointView, type NoteKind, type NoteView } from "@/lib/dashboard/types";

/**
 * The during-the-day screen: record a check-in, or drop a note on the board.
 *
 * Kept separate from the morning form on purpose. At 12 PM nobody wants to
 * scroll past sixteen fields to type one number — this screen asks for the two
 * counts and nothing else, so a check-in takes about fifteen seconds.
 */
type Status =
  | { state: "idle" }
  | { state: "saving" }
  | { state: "saved"; message: string }
  | { state: "error"; message: string };

const NOTE_ICONS: Record<NoteKind, typeof Megaphone> = {
  NOTE: Megaphone,
  STOCK_LOW: TriangleAlert,
  STOCK_EXPECTED: PackagePlus,
};

export function CheckInForm({
  dashboardDate,
  checkpoints,
  notes,
  personalisedTarget,
  shippingTarget,
}: {
  dashboardDate: string;
  checkpoints: CheckpointView[];
  notes: NoteView[];
  personalisedTarget: number | null;
  shippingTarget: number | null;
}) {
  const router = useRouter();

  // Default to the first check-in that has not been recorded yet — almost
  // always the one the user came here to fill in.
  const firstPending = checkpoints.find((checkpoint) => !checkpoint.isRecorded);
  const [selectedId, setSelectedId] = useState(
    firstPending?.id ?? checkpoints[checkpoints.length - 1]?.id ?? "",
  );
  const selected = checkpoints.find((checkpoint) => checkpoint.id === selectedId);

  const [personalised, setPersonalised] = useState(
    selected?.personalisedComplete !== null && selected?.personalisedComplete !== undefined
      ? String(selected.personalisedComplete)
      : "",
  );
  const [shipped, setShipped] = useState(
    selected?.shippedComplete !== null && selected?.shippedComplete !== undefined
      ? String(selected.shippedComplete)
      : "",
  );
  const [note, setNote] = useState(selected?.note ?? "");
  const [status, setStatus] = useState<Status>({ state: "idle" });

  const [noteKind, setNoteKind] = useState<NoteKind>("NOTE");
  const [noteBody, setNoteBody] = useState("");
  const [noteStatus, setNoteStatus] = useState<Status>({ state: "idle" });

  function selectCheckpoint(id: string) {
    const checkpoint = checkpoints.find((item) => item.id === id);
    setSelectedId(id);
    setPersonalised(
      checkpoint?.personalisedComplete !== null && checkpoint?.personalisedComplete !== undefined
        ? String(checkpoint.personalisedComplete)
        : "",
    );
    setShipped(
      checkpoint?.shippedComplete !== null && checkpoint?.shippedComplete !== undefined
        ? String(checkpoint.shippedComplete)
        : "",
    );
    setNote(checkpoint?.note ?? "");
    setStatus({ state: "idle" });
  }

  async function submitCheckpoint(event: React.FormEvent) {
    event.preventDefault();
    setStatus({ state: "saving" });

    try {
      const response = await fetch("/api/checkpoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkpointId: selectedId,
          personalisedComplete: personalised,
          shippedComplete: shipped,
          note,
        }),
      });

      if (response.ok) {
        setStatus({ state: "saved", message: "Check-in recorded. The board is updating." });
        router.refresh();
        return;
      }

      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setStatus({ state: "error", message: data.error ?? "Could not save. Please try again." });
    } catch {
      setStatus({ state: "error", message: "Could not reach the server. Try again." });
    }
  }

  async function submitNote(event: React.FormEvent) {
    event.preventDefault();
    setNoteStatus({ state: "saving" });

    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dashboardDate, kind: noteKind, body: noteBody }),
      });

      if (response.ok) {
        setNoteBody("");
        setNoteStatus({ state: "saved", message: "Added to the board." });
        router.refresh();
        return;
      }

      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setNoteStatus({ state: "error", message: data.error ?? "Could not add that." });
    } catch {
      setNoteStatus({ state: "error", message: "Could not reach the server. Try again." });
    }
  }

  async function removeNote(noteId: string) {
    await fetch(`/api/notes?id=${encodeURIComponent(noteId)}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-5 py-8 sm:px-6">
      {/* --- Record a check-in ------------------------------------------- */}
      <form onSubmit={submitCheckpoint} className="tcs-panel rounded-2xl p-6 sm:p-8">
        <h2 className="text-sm font-bold uppercase tracking-[0.22em] text-gold-deep">
          RECORD A CHECK-IN
        </h2>

        {checkpoints.length === 0 ? (
          <p className="mt-4 text-ink-muted">
            Publish today&rsquo;s dashboard first and the check-ins will appear here.
          </p>
        ) : (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {checkpoints.map((checkpoint) => {
                const isSelected = checkpoint.id === selectedId;
                return (
                  <label
                    key={checkpoint.id}
                    className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border px-4 py-4 text-center transition ${
                      isSelected
                        ? "border-gold-deep bg-gold-wash"
                        : "border-rule bg-surface hover:border-gold"
                    }`}
                  >
                    <input
                      type="radio"
                      name="checkpoint"
                      value={checkpoint.id}
                      checked={isSelected}
                      onChange={() => selectCheckpoint(checkpoint.id)}
                      className="sr-only"
                    />
                    <span className="text-sm font-bold tracking-wide text-ink">
                      {checkpoint.label}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
                      {checkpoint.isRecorded ? (
                        <>
                          <Check className="size-3.5 text-ontrack" aria-hidden="true" />
                          Recorded
                        </>
                      ) : (
                        "Not yet"
                      )}
                    </span>
                  </label>
                );
              })}
            </div>

            <p className="mt-6 text-sm text-ink-muted">
              Enter the <strong className="text-ink-soft">running total so far today</strong>, not
              the number since the last check-in.
            </p>

            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="personalised" className="block text-base font-semibold text-ink-soft">
                  Orders personalised so far
                  {personalisedTarget !== null ? (
                    <span className="ml-1 font-normal text-ink-faint">
                      of {personalisedTarget.toLocaleString("en-AU")}
                    </span>
                  ) : null}
                </label>
                <input
                  id="personalised"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  placeholder="—"
                  className="tcs-field mt-2 text-2xl font-bold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  value={personalised}
                  onChange={(event) => setPersonalised(event.target.value)}
                  onWheel={(event) => event.currentTarget.blur()}
                />
              </div>

              <div>
                <label htmlFor="shipped" className="block text-base font-semibold text-ink-soft">
                  Orders shipped so far
                  {shippingTarget !== null ? (
                    <span className="ml-1 font-normal text-ink-faint">
                      of {shippingTarget.toLocaleString("en-AU")}
                    </span>
                  ) : null}
                </label>
                <input
                  id="shipped"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  placeholder="—"
                  className="tcs-field mt-2 text-2xl font-bold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  value={shipped}
                  onChange={(event) => setShipped(event.target.value)}
                  onWheel={(event) => event.currentTarget.blur()}
                />
              </div>
            </div>

            <div className="mt-5">
              <label htmlFor="checkpointNote" className="block text-base font-semibold text-ink-soft">
                Anything to add? (optional)
              </label>
              <input
                id="checkpointNote"
                type="text"
                className="tcs-field mt-2"
                placeholder="e.g. Machine 2 back up and running"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={status.state === "saving"}
              className="mt-6 w-full rounded-xl bg-ink px-6 py-4 text-base font-bold tracking-wide text-white transition hover:bg-gold-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status.state === "saving" ? "SAVING…" : "SAVE CHECK-IN"}
            </button>

            <div aria-live="polite" className="mt-4">
              {status.state === "saved" ? (
                <div className="rounded-xl border border-ontrack/45 bg-ontrack-wash p-4">
                  <p className="flex items-center gap-2 font-semibold text-ontrack">
                    <Check className="size-5 shrink-0" aria-hidden="true" />
                    {status.message}
                  </p>
                  <Link
                    href="/"
                    className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-ontrack underline-offset-4 hover:underline"
                  >
                    VIEW WAREHOUSE DASHBOARD
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              ) : null}
              {status.state === "error" ? (
                <p role="alert" className="rounded-xl border border-action/50 bg-action-wash p-4 font-medium text-ink">
                  {status.message}
                </p>
              ) : null}
            </div>
          </>
        )}
      </form>

      {/* --- Add a note --------------------------------------------------- */}
      <form onSubmit={submitNote} className="tcs-panel rounded-2xl p-6 sm:p-8">
        <h2 className="text-sm font-bold uppercase tracking-[0.22em] text-gold-deep">
          ADD TO THE BOARD
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Something that came up: a heads up, stock running low, or a delivery on its way.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {NOTE_KINDS.map((kind) => {
            const Icon = NOTE_ICONS[kind];
            const isSelected = noteKind === kind;
            return (
              <label
                key={kind}
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-3 text-center text-sm font-bold tracking-wide transition ${
                  isSelected
                    ? "border-gold-deep bg-gold-wash text-ink"
                    : "border-rule bg-surface text-ink-muted hover:border-gold hover:text-ink"
                }`}
              >
                <input
                  type="radio"
                  name="noteKind"
                  value={kind}
                  checked={isSelected}
                  onChange={() => setNoteKind(kind)}
                  className="sr-only"
                />
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {NOTE_KIND_LABELS[kind]}
              </label>
            );
          })}
        </div>

        <label htmlFor="noteBody" className="mt-5 block text-base font-semibold text-ink-soft">
          What should the team know?
        </label>
        <textarea
          id="noteBody"
          rows={2}
          className="tcs-field mt-2 resize-y"
          placeholder="e.g. Gold ribbon delivery arriving 2pm"
          value={noteBody}
          onChange={(event) => setNoteBody(event.target.value)}
        />

        <button
          type="submit"
          disabled={noteStatus.state === "saving" || noteBody.trim() === ""}
          className="mt-4 w-full rounded-xl border border-ink px-6 py-3.5 text-base font-bold tracking-wide text-ink transition hover:bg-ink hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {noteStatus.state === "saving" ? "ADDING…" : "ADD TO BOARD"}
        </button>

        <div aria-live="polite">
          {noteStatus.state === "error" ? (
            <p role="alert" className="mt-3 text-sm font-medium text-action">
              {noteStatus.message}
            </p>
          ) : null}
        </div>

        {notes.length > 0 ? (
          <ul className="mt-6 space-y-2 border-t border-rule pt-4">
            {notes.map((item) => (
              <li key={item.id} className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 text-xs font-bold uppercase tracking-wider text-ink-muted">
                  {item.timeLabel}
                </span>
                <p className="min-w-0 flex-1 text-ink">{item.body}</p>
                <button
                  type="button"
                  onClick={() => removeNote(item.id)}
                  aria-label={`Remove note: ${item.body}`}
                  className="shrink-0 rounded-lg p-1.5 text-ink-faint transition hover:bg-action-wash hover:text-action"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </form>
    </div>
  );
}
