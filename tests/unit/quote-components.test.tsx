import { useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiClientError } from '@/features/catalog/api/client';
import { useConsultantStore } from '@/features/preview/state/consultant-store';
import { createLocalConsultantProfileStorage } from '@/features/preview/state/consultant-profiles';
import { usePreviewStore } from '@/features/preview/state/preview-store';
import { QuoteDialog } from '@/features/quotes/components/quote-dialog';
import { QuoteHistory } from '@/features/quotes/components/quote-history';
import { QuotePrint } from '@/features/quotes/components/quote-print';
import { useQuoteUiStore } from '@/features/quotes/state/quote-ui-store';
import { buildQuoteShareUrl } from '@/features/quotes/hooks/use-quote-link';
import { resetToastIds, useToastStore } from '@/components/ui/toast-store';
import { QUOTE_DISCLAIMER, QUOTE_TERMS_AND_CONDITIONS } from '@/server/quote/quote-terms';
import { hiluxDetail, ps4Detail, te37Detail } from '../helpers/catalog-fixtures';
import { completeConfiguration, createQuoteRecord } from '../helpers/quote-fixtures';
import { renderWithQuery } from '../helpers/render';
import type { QuoteDetail, QuoteSummary as QuoteSummaryDto } from '@/types/quote';
import { buildQuoteDetail } from '@/server/quote/quote-builder';

/**
 * Quote workspace UI — the dialog (compose + view modes), the print
 * document and the tenant's quote history, exercised against a mocked quote
 * API layer. Money assertions only check presentation of server-computed
 * cents; never arithmetic in the UI.
 */

vi.mock('@/features/catalog/api/vehicles', () => ({ listVehicles: vi.fn(), getVehicle: vi.fn() }));
vi.mock('@/features/catalog/api/wheels', () => ({ listWheels: vi.fn(), getWheel: vi.fn() }));
vi.mock('@/features/catalog/api/tyres', () => ({ listTyres: vi.fn(), getTyre: vi.fn() }));
vi.mock('@/features/quotes/api/quotes', () => ({
  createQuote: vi.fn(),
  listQuotes: vi.fn(),
  getQuote: vi.fn(),
  duplicateQuote: vi.fn(),
  archiveQuote: vi.fn(),
}));

import { getVehicle } from '@/features/catalog/api/vehicles';
import { getWheel } from '@/features/catalog/api/wheels';
import { getTyre } from '@/features/catalog/api/tyres';
import {
  archiveQuote,
  createQuote,
  duplicateQuote,
  getQuote,
  listQuotes,
} from '@/features/quotes/api/quotes';

const issuedQuote: QuoteDetail = buildQuoteDetail(createQuoteRecord());

const archivedQuote: QuoteDetail = {
  ...issuedQuote,
  status: 'ARCHIVED',
  archivedAt: '2026-07-31T12:00:00.000Z',
};

const duplicate: QuoteDetail = {
  ...issuedQuote,
  id: '00000000-0000-4000-8000-000000000002',
  quoteNumber: 'WV-2026-000002',
};

function summaryOf(quote: QuoteDetail): QuoteSummaryDto {
  return {
    id: quote.id,
    quoteNumber: quote.quoteNumber,
    status: quote.status,
    customerName: quote.customerName,
    totalCents: quote.totals.totalCents,
    currency: quote.currency,
    createdAt: quote.createdAt,
    validUntil: quote.validUntil,
  };
}

function pageOf(quotes: readonly QuoteSummaryDto[], totalPages = 1) {
  return { data: [...quotes], meta: { page: 1, pageSize: 10, total: quotes.length, totalPages } };
}

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  };
}

/** Compose mode needs the dialog open; render it once the store is primed. */
function ComposeHarness() {
  const openForConfiguration = useQuoteUiStore((state) => state.openForConfiguration);
  useEffect(() => {
    openForConfiguration();
  }, [openForConfiguration]);
  return <QuoteDialog />;
}

function selectCompleteConfiguration() {
  const store = usePreviewStore.getState();
  store.selectVehicle(hiluxDetail.id);
  store.selectColour('Silver');
  store.selectWheel(te37Detail.id);
  store.selectWheelFinish('Matte Black');
  store.selectWheelSize('sz-18x8');
  store.selectTyre(ps4Detail.id);
  store.selectTyreProfile('pf-265-65-17');
}

beforeEach(() => {
  window.localStorage.clear();
  usePreviewStore.getState().resetConfiguration();
  useQuoteUiStore.setState({ open: false, quoteId: null, historyOpen: false });
  useConsultantStore.setState({
    storage: createLocalConsultantProfileStorage(memoryStorage()),
    profiles: [],
    activeId: null,
    hydrated: true,
  });
  useToastStore.getState().clear();
  resetToastIds();
  vi.mocked(getVehicle).mockReset().mockResolvedValue(hiluxDetail);
  vi.mocked(getWheel).mockReset().mockResolvedValue(te37Detail);
  vi.mocked(getTyre).mockReset().mockResolvedValue(ps4Detail);
  vi.mocked(createQuote).mockReset();
  vi.mocked(listQuotes).mockReset();
  vi.mocked(getQuote).mockReset();
  vi.mocked(duplicateQuote).mockReset();
  vi.mocked(archiveQuote).mockReset();
});

describe('QuoteDialog — compose mode', () => {
  it('redirects to the configuration when the selection is incomplete', async () => {
    renderWithQuery(<ComposeHarness />);

    expect(
      await screen.findByText(/Complete the vehicle, wheel and tyre selection before generating/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to configuration' })).toBeInTheDocument();
    expect(createQuote).not.toHaveBeenCalled();
  });

  it('reviews the resolved package and issues the quotation server-side', async () => {
    vi.mocked(createQuote).mockResolvedValue(issuedQuote);
    vi.mocked(getQuote).mockResolvedValue(issuedQuote);
    const user = userEvent.setup();
    selectCompleteConfiguration();
    renderWithQuery(<ComposeHarness />);

    // The composed review shows the resolved package rows (never prices).
    expect(await screen.findByText('2025 Toyota Hilux SR5 Double Cab')).toBeInTheDocument();
    expect(screen.getByText('Rays TE37')).toBeInTheDocument();
    expect(screen.getByText('265/65 R17')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Customer name'), 'Mrs Nkosi');
    await user.type(screen.getByLabelText('Email (optional)'), 'nkosi@example.co.za');
    await user.type(screen.getByLabelText('Phone (optional)'), '+27 82 555 0100');
    await user.type(screen.getByLabelText('Consultant (optional)'), 'Thandi');
    await user.click(screen.getByRole('button', { name: 'Issue quotation' }));

    await waitFor(() => expect(createQuote).toHaveBeenCalledTimes(1));
    expect(vi.mocked(createQuote).mock.calls[0][0]).toEqual({
      configuration: { ...completeConfiguration },
      customer: { name: 'Mrs Nkosi', email: 'nkosi@example.co.za', phone: '+27 82 555 0100' },
      consultantName: 'Thandi',
    });

    // Success flips the dialog into the immutable view of the issued quote.
    expect(await screen.findAllByText('WV-2026-000001')).not.toHaveLength(0);
    expect(useQuoteUiStore.getState().quoteId).toBe(issuedQuote.id);
    expect(
      useToastStore
        .getState()
        .toasts.some(
          (toast) => toast.kind === 'success' && toast.message.includes('WV-2026-000001'),
        ),
    ).toBe(true);
  });

  it('validates the customer name locally before any request leaves', async () => {
    const user = userEvent.setup();
    selectCompleteConfiguration();
    renderWithQuery(<ComposeHarness />);
    await screen.findByText('2025 Toyota Hilux SR5 Double Cab');

    await user.click(screen.getByRole('button', { name: 'Issue quotation' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('The customer name is required.');
    expect(createQuote).not.toHaveBeenCalled();
  });

  it('surfaces missing price book entries from a 400 rejection', async () => {
    vi.mocked(createQuote).mockRejectedValue(
      new ApiClientError('No price book entry for this selection', 400, 'VALIDATION_ERROR', {
        missingPrices: ['wheel', 'tyre'],
      }),
    );
    const user = userEvent.setup();
    selectCompleteConfiguration();
    renderWithQuery(<ComposeHarness />);
    await screen.findByText('2025 Toyota Hilux SR5 Double Cab');

    await user.type(screen.getByLabelText('Customer name'), 'Mrs Nkosi');
    await user.click(screen.getByRole('button', { name: 'Issue quotation' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No price book entry for this selection');
    expect(within(alert).getByText('wheel')).toBeInTheDocument();
    expect(within(alert).getByText('tyre')).toBeInTheDocument();
    expect(useQuoteUiStore.getState().quoteId).toBeNull();
  });
});

describe('QuoteDialog — view mode', () => {
  it('renders the issued quotation: summary, lines, totals, share and actions', async () => {
    vi.mocked(getQuote).mockResolvedValue(issuedQuote);
    useQuoteUiStore.setState({ open: true, quoteId: issuedQuote.id });
    renderWithQuery(<QuoteDialog />);

    expect(await screen.findAllByText('WV-2026-000001')).not.toHaveLength(0);
    expect(screen.getAllByText('Mrs Nkosi').length).toBeGreaterThan(0); // summary + print doc
    expect(screen.getAllByText('Rays TE37 18×8.0J — Matte Black').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Michelin Pilot Sport 4 265/65 R17').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/VAT \(15%\)/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Total \(VAT incl\.\)/).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Copy Link' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Email' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'WhatsApp' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Print quotation' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Duplicate' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument();
  });

  it('disables archive and explains finality for an archived quotation', async () => {
    vi.mocked(getQuote).mockResolvedValue(archivedQuote);
    useQuoteUiStore.setState({ open: true, quoteId: archivedQuote.id });
    renderWithQuery(<QuoteDialog />);

    expect(await screen.findAllByText('WV-2026-000001')).not.toHaveLength(0);
    const archivedButton = screen.getByRole('button', { name: 'WV-2026-000001 already archived' });
    expect(archivedButton).toBeDisabled();
    expect(screen.getByText(/This quotation is archived/)).toBeInTheDocument();
  });

  it('tells the dealer a shared link is stale when the quote 404s', async () => {
    vi.mocked(getQuote).mockRejectedValue(
      new ApiClientError('Quote not found', 404, 'NOT_FOUND', null),
    );
    useQuoteUiStore.setState({ open: true, quoteId: '00000000-0000-4000-8000-000000000099' });
    renderWithQuery(<QuoteDialog />);

    expect(await screen.findByText('Quote not found')).toBeInTheDocument();
    expect(screen.getByText(/does not exist for this dealership/)).toBeInTheDocument();
  });

  it('copies the share link through the clipboard transport', async () => {
    vi.mocked(getQuote).mockResolvedValue(issuedQuote);
    useQuoteUiStore.setState({ open: true, quoteId: issuedQuote.id });
    const user = userEvent.setup();
    renderWithQuery(<QuoteDialog />);
    await screen.findAllByText('WV-2026-000001');

    await user.click(screen.getByRole('button', { name: 'Copy Link' }));

    await waitFor(async () => {
      const written = await window.navigator.clipboard.readText();
      expect(written).toBe(buildQuoteShareUrl(issuedQuote.id));
    });
    expect(useToastStore.getState().toasts.some((toast) => toast.kind === 'success')).toBe(true);
  });
});

describe('QuotePrint', () => {
  it('lays out the professional quotation document from the immutable quote', () => {
    renderWithQuery(<QuotePrint quote={issuedQuote} />);

    // The document is aria-hidden on screen (print:block only) — role queries opt into hidden.
    expect(screen.getByRole('heading', { name: 'Quotation', hidden: true })).toBeInTheDocument();
    expect(screen.getAllByText('WV-2026-000001').length).toBeGreaterThanOrEqual(2); // header + footer
    expect(screen.getAllByText('Demo Tenant').length).toBeGreaterThan(0);
    expect(screen.getByText('Prepared for')).toBeInTheDocument();
    expect(screen.getAllByText('Mrs Nkosi').length).toBeGreaterThan(0);
    expect(screen.getByText(/Valid until/)).toBeInTheDocument();
    expect(screen.getByText('Consultant: Thandi')).toBeInTheDocument();

    // Package block from the snapshot, line items and money in ZAR.
    expect(screen.getByText('2025 Toyota Hilux SR5 Double Cab')).toBeInTheDocument();
    expect(screen.getAllByText(/Rays TE37 18×8\.0J/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Michelin Pilot Sport 4 265\/65 R17/).length).toBeGreaterThan(0);
    expect(screen.getByText('R 6 255,00')).toBeInTheDocument(); // subtotal
    expect(screen.getByText('VAT (15%)')).toBeInTheDocument();
    expect(screen.getByText('Total (VAT incl.)')).toBeInTheDocument();
    expect(screen.getByText('R 7 193,25')).toBeInTheDocument(); // grand total

    // Terms, disclaimer and the QR placeholder block.
    for (const term of QUOTE_TERMS_AND_CONDITIONS) {
      expect(screen.getByText(term)).toBeInTheDocument();
    }
    expect(screen.getByText(QUOTE_DISCLAIMER)).toBeInTheDocument();
    expect(screen.getByText('QR code')).toBeInTheDocument();
  });
});

describe('QuoteHistory', () => {
  it('lists issued quotes and recalls one into the workspace', async () => {
    vi.mocked(listQuotes).mockResolvedValue(pageOf([summaryOf(issuedQuote)]));
    const user = userEvent.setup();
    useQuoteUiStore.setState({ historyOpen: true });
    renderWithQuery(<QuoteHistory />);

    expect(await screen.findByText('WV-2026-000001')).toBeInTheDocument();
    expect(screen.getByText('ISSUED')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open WV-2026-000001' }));
    expect(useQuoteUiStore.getState().historyOpen).toBe(false);
    expect(useQuoteUiStore.getState().quoteId).toBe(issuedQuote.id);
  });

  it('applies the status filter through the query layer', async () => {
    vi.mocked(listQuotes).mockResolvedValue(pageOf([]));
    const user = userEvent.setup();
    useQuoteUiStore.setState({ historyOpen: true });
    renderWithQuery(<QuoteHistory />);
    await screen.findByText('No quotes issued yet');

    await user.click(screen.getByRole('button', { name: 'Archived' }));

    await waitFor(() =>
      expect(listQuotes).toHaveBeenCalledWith({ page: 1, pageSize: 10, status: 'ARCHIVED' }),
    );
  });

  it('duplicates a quote and opens the fresh copy', async () => {
    vi.mocked(listQuotes).mockResolvedValue(pageOf([summaryOf(issuedQuote)]));
    vi.mocked(duplicateQuote).mockResolvedValue(duplicate);
    const user = userEvent.setup();
    useQuoteUiStore.setState({ historyOpen: true });
    renderWithQuery(<QuoteHistory />);
    await screen.findByText('WV-2026-000001');

    await user.click(screen.getByRole('button', { name: 'Duplicate WV-2026-000001' }));

    await waitFor(() => expect(duplicateQuote).toHaveBeenCalledWith(issuedQuote.id));
    await waitFor(() =>
      expect(useQuoteUiStore.getState().quoteId).toBe('00000000-0000-4000-8000-000000000002'),
    );
    expect(
      useToastStore
        .getState()
        .toasts.some(
          (toast) => toast.kind === 'success' && toast.message.includes('WV-2026-000002'),
        ),
    ).toBe(true);
  });

  it('archives an issued quote from the list row', async () => {
    vi.mocked(listQuotes).mockResolvedValue(pageOf([summaryOf(issuedQuote)]));
    vi.mocked(archiveQuote).mockResolvedValue(archivedQuote);
    const user = userEvent.setup();
    useQuoteUiStore.setState({ historyOpen: true });
    renderWithQuery(<QuoteHistory />);
    await screen.findByText('WV-2026-000001');

    await user.click(screen.getByRole('button', { name: 'Archive WV-2026-000001' }));

    await waitFor(() => expect(archiveQuote).toHaveBeenCalledWith(issuedQuote.id));
    expect(
      useToastStore
        .getState()
        .toasts.some((toast) => toast.kind === 'info' && toast.message.includes('archived')),
    ).toBe(true);
  });

  it('hides the archive action on rows that are already archived', async () => {
    vi.mocked(listQuotes).mockResolvedValue(pageOf([summaryOf(archivedQuote)]));
    useQuoteUiStore.setState({ historyOpen: true });
    renderWithQuery(<QuoteHistory />);

    expect(await screen.findByText('WV-2026-000001')).toBeInTheDocument();
    expect(screen.getByText('ARCHIVED')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archive WV-2026-000001' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Duplicate WV-2026-000001' })).toBeInTheDocument();
  });
});
