/**
 * The trust line.
 *
 * Warehouse staff need to know the board in front of them reflects today's
 * instructions, not yesterday's. The breathing dot shows the page is live and
 * still polling; the timestamp shows when a human last published.
 */
export function LastUpdated({
  lastUpdatedLabel,
  lastUpdatedDayLabel,
  updatedBy,
  isStale,
}: {
  lastUpdatedLabel: string | null;
  lastUpdatedDayLabel: string | null;
  updatedBy: string | null;
  isStale: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
      <p className={`tcs-eyebrow text-eyebrow ${isStale ? "text-busy" : "text-ink-muted"}`}>
        {lastUpdatedLabel ? (
          <>
            LAST UPDATED {lastUpdatedLabel}
            {/* The day is spelled out when stale so the time cannot be
                mistaken for "this morning". */}
            {isStale && lastUpdatedDayLabel ? <> ON {lastUpdatedDayLabel}</> : null}
            {updatedBy ? <> &middot; UPDATED BY {updatedBy}</> : null}
          </>
        ) : (
          "NEVER UPDATED"
        )}
      </p>

      <p className="tcs-eyebrow flex items-center gap-2.5 text-eyebrow text-ink-muted">
        <span
          className={`tcs-live-dot size-2 rounded-full ${isStale ? "bg-busy" : "bg-ontrack"}`}
          aria-hidden="true"
        />
        LIVE &middot; CHECKS FOR UPDATES EVERY 20 SECONDS
      </p>
    </div>
  );
}
