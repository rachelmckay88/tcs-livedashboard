import { ClipboardEdit } from "lucide-react";

/**
 * First-use / not-yet-published state.
 *
 * The header above this still shows today's date and the Christmas countdown,
 * so the screen never looks broken — it just says, plainly, that nobody has
 * published yet. Showing zeroes here would be actively misleading.
 */
export function EmptyState() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center">
      <div className="tcs-panel max-w-3xl rounded-2xl px-8 py-12 text-center lg:px-16 lg:py-16">
        <ClipboardEdit className="mx-auto size-10 text-gold-deep lg:size-14" aria-hidden="true" />
        <h2 className="mt-6 text-brandline font-extrabold uppercase leading-tight tracking-tight text-ink">
          Today&rsquo;s warehouse dashboard
          <br />
          has not yet been published
        </h2>
        <p className="mt-5 text-message leading-snug text-ink-soft">
          Please update the dashboard in Admin.
        </p>
        <p className="tcs-eyebrow mt-8 text-eyebrow text-ink-muted">
          Open <span className="text-gold-deep">/admin</span> on any device to publish today
        </p>
      </div>
    </div>
  );
}
