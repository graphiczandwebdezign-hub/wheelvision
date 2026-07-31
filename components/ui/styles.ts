/**
 * Shared style fragments for the UI primitives. Centralised so no component
 * duplicates styling: every interactive control ships the same focus ring,
 * every surface the same border/radius language. Colours stay on the slate +
 * cyan palette already established in the app.
 */

/** Consistent, always-visible focus treatment for keyboard users. */
export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950';

/** Base treatment for form-style controls (select, input, combobox trigger). */
export const controlBase =
  'w-full rounded-xl border border-slate-700 bg-slate-900/80 text-sm text-slate-100 placeholder-slate-500 transition-colors hover:border-slate-600 disabled:cursor-not-allowed disabled:opacity-50';

/** Card/panel surface language shared by Card, Panel and Sidebar. */
export const surfaceBase = 'rounded-2xl border border-slate-800 bg-slate-900/70';
