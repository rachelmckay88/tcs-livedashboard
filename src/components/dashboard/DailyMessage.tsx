import { Megaphone, PackagePlus, TriangleAlert } from "lucide-react";
import { NOTE_KIND_LABELS, type NoteKind, type NoteView } from "@/lib/dashboard/types";

/**
 * TODAY'S HEADS UP — the morning message, plus anything that has come up since.
 *
 * This is a primary element, not a footnote: it is where "express Santa sacks
 * first" and "red ribbon is low" live. The morning message sits at the top in
 * the largest text; notes added during the day stack below it with the time
 * they were added, so the floor can see at a glance that something is new.
 */
const NOTE_STYLES: Record<NoteKind, { chip: string; Icon: typeof Megaphone }> = {
  NOTE: { chip: "border-rule bg-surface-sunk text-ink-soft", Icon: Megaphone },
  STOCK_LOW: { chip: "border-busy/45 bg-busy-wash text-busy", Icon: TriangleAlert },
  STOCK_EXPECTED: { chip: "border-ontrack/40 bg-ontrack-wash text-ontrack", Icon: PackagePlus },
};

export function DailyMessage({
  message,
  secondaryMessage,
  notes,
}: {
  message: string | null;
  secondaryMessage: string | null;
  notes: NoteView[];
}) {
  return (
    <section
      className="tcs-panel flex min-w-0 flex-col overflow-hidden rounded-2xl border-l-4 border-l-gold p-5 lg:p-6"
      aria-label="Today's heads up"
    >
      <h2 className="flex items-center gap-2.5 text-panel-label">
        <Megaphone className="size-[1.15em] shrink-0 text-gold-deep" aria-hidden="true" />
        <span className="tcs-eyebrow text-ink">TODAY&rsquo;S HEADS UP</span>
      </h2>

      {message ? (
        <p className="mt-3 whitespace-pre-line text-message font-medium leading-snug text-ink">
          {message}
        </p>
      ) : (
        <p className="mt-3 text-message font-medium leading-snug text-ink-faint">
          No message for today.
        </p>
      )}

      {secondaryMessage ? (
        <p className="mt-3 whitespace-pre-line text-message-sub leading-snug text-ink-soft">
          {secondaryMessage}
        </p>
      ) : null}

      {notes.length > 0 ? (
        <ul className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto border-t border-rule pt-3">
          {notes.map((note) => {
            const { chip, Icon } = NOTE_STYLES[note.kind];
            return (
              <li key={note.id} className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[0.65em] font-bold uppercase tracking-wider ${chip}`}
                >
                  <Icon className="size-[1.15em] shrink-0" aria-hidden="true" />
                  {NOTE_KIND_LABELS[note.kind]}
                </span>
                <p className="min-w-0 text-message-sub leading-snug text-ink">
                  {note.body}
                  <span className="ml-2 whitespace-nowrap text-ink-faint">{note.timeLabel}</span>
                </p>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
