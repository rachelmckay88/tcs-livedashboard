import Image from "next/image";
import { ChristmasCountdown } from "./ChristmasCountdown";
import { StatusBadge } from "./StatusBadge";
import type { OverallStatus } from "@/lib/dashboard/types";

/**
 * Top of the board: who we are, what day it is, how the day is going, and how
 * close Christmas is. Everything here is derived automatically except the
 * status, which the morning admin sets.
 */
export function DashboardHeader({
  fullDateLabel,
  sleepsToChristmas,
  status,
  showStatus,
}: {
  fullDateLabel: string;
  sleepsToChristmas: number;
  status: OverallStatus;
  /** Hidden before the first publish — an unset status would be misleading. */
  showStatus: boolean;
}) {
  return (
    // minmax(0,1fr) rather than 1fr: a bare 1fr track refuses to shrink below
    // its content's min width, which pushes the countdown off the right edge.
    <header className="grid shrink-0 grid-cols-1 items-center gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-6">
      {/* Brand lockup — the real logo, with the wordmark treatment below it. */}
      <div className="flex min-w-0 items-center gap-4">
        <Image
          src="/brand/tcs-logo.png"
          alt="The Celebration Society"
          width={215}
          height={80}
          priority
          className="h-auto w-[7.5rem] shrink-0 lg:w-[10rem]"
        />
        <h1 className="tcs-wordmark text-brandline font-extrabold uppercase leading-none tracking-tight text-ink">
          Warehouse
          <br />
          Today
        </h1>
      </div>

      {/* Date + status, centred on the board */}
      <div className="flex flex-col items-start gap-2.5 lg:items-center">
        <p className="tcs-eyebrow text-panel-label leading-none text-ink-soft">{fullDateLabel}</p>
        {showStatus ? <StatusBadge status={status} /> : null}
      </div>

      {/* Countdown */}
      <div className="flex min-w-0 lg:justify-end">
        <ChristmasCountdown sleeps={sleepsToChristmas} />
      </div>
    </header>
  );
}
