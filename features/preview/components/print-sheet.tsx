'use client';

import { useEffect, useState } from 'react';
import { usePreviewSelection } from '@/features/preview/hooks/use-preview-selection';
import { buildConfigurationRows } from '@/features/preview/selection/configuration-rows';
import { useConsultantStore } from '@/features/preview/state/consultant-store';
import { useQuoteUiStore } from '@/features/quotes/state/quote-ui-store';

/**
 * Print-only customer handout — groundwork for the Sprint 8 quote document.
 * Hidden on screen (`hidden` + aria-hidden), revealed by the print media
 * rules while the rest of the app hides itself. It is deliberately a
 * configuration summary, not a quotation: pricing stays out until the quote
 * engine lands, and the footer says so plainly.
 *
 * The timestamp refreshes on the browser's `beforeprint` event so the paper
 * shows the actual print moment, and `suppressHydrationWarning` covers the
 * one intentional server/client difference (the clock).
 */
export function PrintSheet() {
  const selection = usePreviewSelection();
  // While the quote workspace is open its own document owns the paper —
  // the paper never mixes a quotation with the configuration handout.
  const quoteWorkspaceOpen = useQuoteUiStore((state) => state.open);
  const activeId = useConsultantStore((state) => state.activeId);
  const profiles = useConsultantStore((state) => state.profiles);
  const consultantName = profiles.find((profile) => profile.id === activeId)?.name ?? null;
  const [printedAt, setPrintedAt] = useState(() => new Date());

  useEffect(() => {
    const refreshTimestamp = () => setPrintedAt(new Date());
    window.addEventListener('beforeprint', refreshTimestamp);
    return () => window.removeEventListener('beforeprint', refreshTimestamp);
  }, []);

  const rows = buildConfigurationRows(selection);

  if (quoteWorkspaceOpen) {
    return null;
  }

  return (
    <section
      aria-hidden="true"
      className="hidden print:block bg-white text-slate-900"
      data-print-sheet
    >
      <header className="border-b-2 border-slate-900 pb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
          WheelVision
        </p>
        <h1 className="mt-1 text-2xl font-bold">Wheel &amp; tyre configuration summary</h1>
        <p className="mt-1 text-sm text-slate-600">
          Prepared by {consultantName ?? 'Showroom kiosk'} ·{' '}
          <span suppressHydrationWarning>Printed {printedAt.toLocaleString()}</span>
        </p>
      </header>

      <table className="mt-4 w-full border-collapse text-sm">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-slate-300">
              <th
                scope="row"
                className="w-40 py-2 pr-4 text-left align-top font-semibold text-slate-700"
              >
                {label}
              </th>
              <td className="py-2 text-slate-900">{value ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <footer className="mt-6 border-t border-slate-300 pt-3 text-xs leading-relaxed text-slate-600">
        <p>
          This handout summarises the options selected during the in-store preview. It is not a
          quotation: pricing, fitment confirmation and availability are finalised in the formal
          quote.
        </p>
      </footer>
    </section>
  );
}
