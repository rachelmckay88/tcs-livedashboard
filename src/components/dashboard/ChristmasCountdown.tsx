import { Gift } from "lucide-react";

/**
 * Sleeps until Christmas — one of the largest elements on the board, and the
 * piece that gives the screen its warmth.
 *
 * Handles the edges properly: Christmas Day itself reads as a message rather
 * than a bare "0", and the singular "SLEEP" is used for Christmas Eve.
 */
export function ChristmasCountdown({ sleeps }: { sleeps: number }) {
  const isChristmasDay = sleeps === 0;

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gold/50 bg-gold-wash px-5 py-3 sm:gap-5 sm:px-6">
      <Gift className="hidden size-7 shrink-0 text-gold-deep sm:block lg:size-9" aria-hidden="true" />
      {isChristmasDay ? (
        <div>
          <p className="text-batch font-extrabold leading-[0.9] tracking-tight text-gold-deep">
            MERRY CHRISTMAS
          </p>
          <p className="tcs-eyebrow mt-1.5 text-eyebrow text-ink-soft">IT&rsquo;S CHRISTMAS DAY</p>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <span className="text-hero font-extrabold leading-[0.82] tracking-tight text-gold-deep">
            {sleeps}
          </span>
          {/* Two explicit non-wrapping lines. A width-constrained single string
              would break mid-word or spill out of the card, because the
              letterspaced caps cannot hyphenate. */}
          <span className="tcs-eyebrow-tight text-eyebrow leading-[1.35] text-ink-soft">
            <span className="block whitespace-nowrap">{sleeps === 1 ? "SLEEP" : "SLEEPS"} TO</span>
            <span className="block whitespace-nowrap">CHRISTMAS</span>
          </span>
        </div>
      )}
    </div>
  );
}
