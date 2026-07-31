import { beforeEach, describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { useQuoteLinkSync } from '@/features/quotes/hooks/use-quote-link';
import { useQuoteUiStore } from '@/features/quotes/state/quote-ui-store';

const VALID_ID = '7d8f36c2-52ff-4c3d-9b35-2b266f0e5d21';

describe('quote ui store', () => {
  beforeEach(() => {
    useQuoteUiStore.getState().close();
    useQuoteUiStore.getState().closeHistory();
  });

  it('opens for configuration with no quote loaded', () => {
    useQuoteUiStore.getState().openForConfiguration();
    expect(useQuoteUiStore.getState()).toMatchObject({ open: true, quoteId: null });
  });

  it('opens with a specific quote and closes back to neutral', () => {
    useQuoteUiStore.getState().openWithQuoteId(VALID_ID);
    expect(useQuoteUiStore.getState()).toMatchObject({ open: true, quoteId: VALID_ID });
    useQuoteUiStore.getState().close();
    expect(useQuoteUiStore.getState()).toMatchObject({ open: false, quoteId: null });
  });

  it('toggles the history dialog independently', () => {
    useQuoteUiStore.getState().openHistory();
    expect(useQuoteUiStore.getState().historyOpen).toBe(true);
    useQuoteUiStore.getState().closeHistory();
    expect(useQuoteUiStore.getState().historyOpen).toBe(false);
  });
});

describe('useQuoteLinkSync', () => {
  beforeEach(() => {
    useQuoteUiStore.getState().close();
    window.history.replaceState(null, '', '/preview');
  });

  it('opens the workspace with a valid shared quote id and strips the param', () => {
    window.history.replaceState(null, '', `/preview?quote=${VALID_ID}`);

    renderHook(() => useQuoteLinkSync());

    expect(useQuoteUiStore.getState().quoteId).toBe(VALID_ID);
    expect(useQuoteUiStore.getState().open).toBe(true);
    expect(window.location.search).toBe('');
  });

  it('ignores malformed quote parameters silently', () => {
    window.history.replaceState(null, '', '/preview?quote=not-a-uuid');

    renderHook(() => useQuoteLinkSync());

    expect(useQuoteUiStore.getState().open).toBe(false);
  });

  it('consumes the link only once across remount-worthy re-renders', () => {
    window.history.replaceState(null, '', `/preview?quote=${VALID_ID}`);
    const { rerender } = renderHook(() => useQuoteLinkSync());

    act(() => {
      useQuoteUiStore.getState().close();
    });
    rerender();

    expect(useQuoteUiStore.getState().open).toBe(false);
  });
});
