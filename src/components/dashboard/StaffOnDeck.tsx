import { Users } from "lucide-react";
import type { StaffView } from "@/lib/dashboard/types";

/**
 * Who is in today and what they are on.
 *
 * Useful for the floor ("who do I ask about engraving?") and quietly good for
 * morale — seeing your name on the board matters. Kept to name + role: this is
 * a roster for one day, not a staff directory.
 */
export function StaffOnDeck({ staff }: { staff: StaffView[] }) {
  return (
    <section className="tcs-panel flex min-w-0 flex-col rounded-2xl p-5 lg:p-6" aria-label="Who is on today">
      <h2 className="flex items-center gap-2.5 text-panel-label">
        <Users className="size-[1.15em] shrink-0 text-gold-deep" aria-hidden="true" />
        <span className="tcs-eyebrow text-ink">ON DECK TODAY</span>
      </h2>

      {staff.length === 0 ? (
        <p className="mt-4 text-metric-label text-ink-faint">No one rostered on yet.</p>
      ) : (
        <ul className="mt-4 flex flex-wrap content-start gap-2">
          {staff.map((member) => (
            <li
              key={member.id}
              className="rounded-lg border border-rule bg-surface-sunk px-3 py-2 leading-tight"
            >
              <p className="text-metric-label font-bold text-ink lg:text-panel-label">
                {member.name}
              </p>
              <p className="tcs-eyebrow-tight mt-0.5 text-[0.7em] text-ink-muted">{member.role}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
