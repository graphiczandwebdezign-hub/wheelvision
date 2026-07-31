'use client';

import { useOnlineStatus } from '@/features/preview/hooks/use-online-status';
import { usePreviewStore } from '@/features/preview/state/preview-store';
import { useQuoteUiStore } from '@/features/quotes/state/quote-ui-store';

/**
 * Generate Quote — the commercial entry point of the preview. Sprint 8 wires
 * it live: enabled once the vehicle, colour, wheel, finish, size, tyre and
 * profile are all chosen (and the kiosk is online — pricing is issued by the
 * server), it opens the quote workspace. The hint below the button explains
 * exactly why it is disabled, so the state is never a mystery on the floor.
 * A quiet secondary action opens the tenant's quote history.
 */
export function QuoteButton() {
  const online = useOnlineStatus();
  const openForConfiguration = useQuoteUiStore((state) => state.openForConfiguration);
  const openHistory = useQuoteUiStore((state) => state.openHistory);

  const vehicleId = usePreviewStore((state) => state.vehicleId);
  const colour = usePreviewStore((state) => state.colour);
  const wheelId = usePreviewStore((state) => state.wheelId);
  const wheelFinish = usePreviewStore((state) => state.wheelFinish);
  const wheelSizeId = usePreviewStore((state) => state.wheelSizeId);
  const tyreId = usePreviewStore((state) => state.tyreId);
  const tyreProfileId = usePreviewStore((state) => state.tyreProfileId);

  const complete =
    vehicleId !== null &&
    colour !== null &&
    wheelId !== null &&
    wheelFinish !== null &&
    wheelSizeId !== null &&
    tyreId !== null &&
    tyreProfileId !== null;

  const enabled = complete && online;
  const hint = !complete
    ? 'Complete the vehicle, colour, wheel and tyre selection to generate a quote.'
    : !online
      ? 'Reconnect to generate a quote — pricing is issued by the server.'
      : null;

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={!enabled}
        onClick={openForConfiguration}
        aria-describedby={hint === null ? undefined : 'quote-requirement-hint'}
        className={`min-h-12 w-full rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
          enabled
            ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 active:bg-cyan-300'
            : 'cursor-not-allowed bg-slate-800 text-slate-500 opacity-70'
        }`}
      >
        Generate Quote
      </button>
      {hint !== null ? (
        <p id="quote-requirement-hint" className="text-center text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
      <button
        type="button"
        onClick={openHistory}
        className="mt-1 text-center text-xs text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
      >
        View quote history
      </button>
    </div>
  );
}
