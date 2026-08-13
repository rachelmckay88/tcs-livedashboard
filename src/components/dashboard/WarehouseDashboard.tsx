"use client";

import { useEffect, useState } from "react";
import { Sparkles, Truck } from "lucide-react";
import { BatchPanel } from "./BatchPanel";
import { DailyMessage } from "./DailyMessage";
import { DashboardHeader } from "./DashboardHeader";
import { ExceptionCard } from "./ExceptionCard";
import { LastUpdated } from "./LastUpdated";
import { StaffOnDeck } from "./StaffOnDeck";
import { StaleWarning } from "./StaleWarning";
import { EmptyState } from "./EmptyState";
import type { DashboardView } from "@/lib/dashboard/types";

/** How often the board asks the server whether anything changed. */
const POLL_INTERVAL_MS = 20_000;

/**
 * The warehouse display.
 *
 * Rendered on the server first (so the TV shows real data immediately, even
 * before JavaScript runs), then kept fresh by a light poll.
 *
 * Why polling: it is the simplest thing that reliably survives a screen left
 * open for months. No sockets to drop, no reconnect logic, no extra
 * infrastructure. The endpoint returns a small JSON view model, and we only
 * touch React state when something actually changed — so the screen never
 * flashes or re-flows while someone is reading it.
 */
export function WarehouseDashboard({ initialView }: { initialView: DashboardView }) {
  const [view, setView] = useState(initialView);
  // Bumped only on a real change, to retrigger the gentle fade.
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const response = await fetch("/api/dashboard/today", { cache: "no-store" });

        // Session expired or signed out elsewhere. Reload so the login screen
        // appears: a board that keeps showing yesterday's numbers under a
        // "LIVE" label is worse than one that plainly asks to be signed in.
        if (response.status === 401) {
          window.location.reload();
          return;
        }

        if (!response.ok) return;
        const next = (await response.json()) as DashboardView;
        if (cancelled) return;

        setView((current) => {
          // Compare the fields that can change without a republish too: the
          // Sydney date rolls over at midnight, staleness flips with it, and
          // the pace marker creeps forward as the day passes, so a screen left
          // running corrects itself without a reload.
          const unchanged =
            current.updatedAtIso === next.updatedAtIso &&
            current.dateKey === next.dateKey &&
            current.isStale === next.isStale &&
            current.isPublished === next.isPublished &&
            current.production.progress.done === next.production.progress.done &&
            current.shipping.progress.done === next.shipping.progress.done &&
            current.notes.length === next.notes.length &&
            Math.round(current.production.progress.percentOfDayElapsed) ===
              Math.round(next.production.progress.percentOfDayElapsed);
          if (unchanged) return current;
          setRevision((value) => value + 1);
          return next;
        });
      } catch {
        // Network blip or a server restart — keep showing the last good data
        // and try again on the next tick. The board must never go blank.
      }
    }

    const timer = setInterval(poll, POLL_INTERVAL_MS);
    // Catch up immediately when the TV wakes or the tab is refocused.
    const onVisible = () => {
      if (document.visibilityState === "visible") void poll();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const showEmptyState = !view.isPublished;

  return (
    // lg and up: exactly one screen, never scrolls. Below lg it falls back to
    // ordinary document flow so phones and tablets can scroll normally.
    <main className="tcs-stage flex min-h-screen flex-col gap-4 p-5 sm:p-6 lg:h-screen lg:gap-4 lg:overflow-hidden lg:p-6">
      <DashboardHeader
        fullDateLabel={view.fullDateLabel}
        sleepsToChristmas={view.sleepsToChristmas}
        status={view.status}
        showStatus={!showEmptyState}
      />

      {showEmptyState ? (
        <EmptyState />
      ) : (
        <div key={revision} className="tcs-fade-in flex min-h-0 flex-1 flex-col gap-4">
          {view.isStale ? <StaleWarning /> : null}

          {/* Two dominant panels */}
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
            <BatchPanel
              title="PERSONALISING TODAY"
              Icon={Sparkles}
              batchDateLabel={view.production.batchDateLabel}
              progress={view.production.progress}
              progressLabel="PERSONALISED SO FAR"
              metrics={view.production.metrics}
              checkpoints={view.checkpoints}
              checkpointField="personalised"
            />
            <BatchPanel
              title="SHIPPING TODAY"
              Icon={Truck}
              batchDateLabel={view.shipping.batchDateLabel}
              progress={view.shipping.progress}
              progressLabel="SHIPPED SO FAR"
              metrics={view.shipping.metrics}
              checkpoints={view.checkpoints}
              checkpointField="shipped"
              headerAccessory={
                view.shipping.courierCutoffLabel ? (
                  <div className="flex items-center gap-2.5 rounded-full border border-gold/50 bg-gold-wash px-4 py-1.5">
                    <span className="tcs-eyebrow-tight text-eyebrow text-ink-soft">
                      COURIER CUT-OFF
                    </span>
                    <span className="text-panel-label font-extrabold leading-none tracking-tight text-gold-deep">
                      {view.shipping.courierCutoffLabel}
                    </span>
                  </div>
                ) : null
              }
            />
          </div>

          {/* Exceptions */}
          <div className="grid shrink-0 grid-cols-2 gap-4 lg:grid-cols-4">
            {view.exceptions.map((exception) => (
              <ExceptionCard key={exception.key} exception={exception} />
            ))}
          </div>

          {/* Heads up alongside today's roster */}
          <div className="grid shrink-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <DailyMessage
              message={view.dailyMessage}
              secondaryMessage={view.secondaryMessage}
              notes={view.notes}
            />
            <StaffOnDeck staff={view.staff} />
          </div>
        </div>
      )}

      <footer className="shrink-0">
        <LastUpdated
          lastUpdatedLabel={view.lastUpdatedLabel}
          lastUpdatedDayLabel={view.lastUpdatedDayLabel}
          updatedBy={view.updatedBy}
          isStale={view.isStale || showEmptyState}
        />
      </footer>
    </main>
  );
}
