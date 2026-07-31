'use client';

/**
 * Generate Quote — intentionally disabled this sprint. The quoting engine
 * arrives in Sprint 8; the button ships now so the layout is final and the
 * dealer sees where the commercial flow will live. It is a <button> (not a
 * link) with an always-visible explanation plus a native title tooltip —
 * disabled controls can't show tooltips on their own, so the wrapper span
 * carries it.
 */
export function QuoteButton() {
  return (
    <div className="flex flex-col gap-1">
      <span title="Available in Sprint 8" className="block">
        <button
          type="button"
          disabled
          aria-describedby="quote-sprint-hint"
          className="min-h-12 w-full cursor-not-allowed rounded-xl bg-slate-800 text-sm font-semibold text-slate-500 opacity-70"
        >
          Generate Quote
        </button>
      </span>
      <p id="quote-sprint-hint" className="text-center text-xs text-slate-500">
        Available in Sprint 8
      </p>
    </div>
  );
}
