import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen } from '@testing-library/react';
import { PrintSheet } from '@/features/preview/components/print-sheet';
import { useConsultantStore } from '@/features/preview/state/consultant-store';
import { createLocalConsultantProfileStorage } from '@/features/preview/state/consultant-profiles';
import type { KeyValueStorage } from '@/features/preview/state/key-value-storage';
import { usePreviewStore } from '@/features/preview/state/preview-store';
import { hiluxDetail, ps4Detail, te37Detail } from '../helpers/catalog-fixtures';
import { renderWithQuery } from '../helpers/render';

vi.mock('@/features/catalog/api/vehicles', () => ({ listVehicles: vi.fn(), getVehicle: vi.fn() }));
vi.mock('@/features/catalog/api/wheels', () => ({ listWheels: vi.fn(), getWheel: vi.fn() }));
vi.mock('@/features/catalog/api/tyres', () => ({ listTyres: vi.fn(), getTyre: vi.fn() }));

import { getVehicle } from '@/features/catalog/api/vehicles';
import { getWheel } from '@/features/catalog/api/wheels';
import { getTyre } from '@/features/catalog/api/tyres';

function memoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

function selectFullConfiguration(): void {
  const store = usePreviewStore.getState();
  store.selectVehicle(hiluxDetail.id);
  store.selectColour('Silver');
  store.selectWheel(te37Detail.id);
  store.selectWheelFinish('Matte Black');
  store.selectWheelSize('sz-18x8');
  store.selectTyre(ps4Detail.id);
  store.selectTyreProfile('pf-265-65-17');
}

describe('PrintSheet (customer handout)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    usePreviewStore.getState().resetConfiguration();
    useConsultantStore.setState({
      storage: createLocalConsultantProfileStorage(memoryStorage()),
      profiles: [],
      activeId: null,
      hydrated: true,
    });
    vi.mocked(getVehicle).mockReset().mockResolvedValue(hiluxDetail);
    vi.mocked(getWheel).mockReset().mockResolvedValue(te37Detail);
    vi.mocked(getTyre).mockReset().mockResolvedValue(ps4Detail);
  });

  it('renders the full configuration spec once the details resolve', async () => {
    selectFullConfiguration();
    renderWithQuery(<PrintSheet />);

    expect(await screen.findByText('2025 Toyota Hilux SR5 Double Cab')).toBeInTheDocument();
    expect(screen.getByText('Colour')).toBeInTheDocument();
    expect(screen.getByText('Silver')).toBeInTheDocument();
    expect(screen.getByText('Rays TE37')).toBeInTheDocument();
    expect(screen.getByText('Matte Black')).toBeInTheDocument();
    expect(screen.getByText('18×8.0J')).toBeInTheDocument();
    expect(screen.getByText('Michelin Pilot Sport 4')).toBeInTheDocument();
    expect(screen.getByText('265/65 R17')).toBeInTheDocument();
  });

  it('is hidden from the screen and from assistive tech on screen', () => {
    const { container } = renderWithQuery(<PrintSheet />);
    const sheet = container.querySelector('[data-print-sheet]');
    expect(sheet).not.toBeNull();
    expect(sheet?.className).toContain('hidden');
    expect(sheet?.className).toContain('print:block');
    expect(sheet?.getAttribute('aria-hidden')).toBe('true');
  });

  it('attributes the handout to the showroom when no profile is active', () => {
    renderWithQuery(<PrintSheet />);
    expect(screen.getByText(/Prepared by/)).toHaveTextContent('Prepared by Showroom kiosk');
  });

  it('attributes the handout to the active consultant', () => {
    useConsultantStore.setState({
      profiles: [{ id: 'p1', name: 'Thandi', createdAt: '2026-07-31T08:00:00.000Z' }],
      activeId: 'p1',
    });
    renderWithQuery(<PrintSheet />);
    expect(screen.getByText(/Prepared by/)).toHaveTextContent('Prepared by Thandi');
  });

  it('speaks plainly: a summary, never a quotation', () => {
    renderWithQuery(<PrintSheet />);
    expect(screen.getByText(/It is not a quotation/)).toBeInTheDocument();
    expect(screen.getByText(/formal quote/)).toBeInTheDocument();
  });

  it('carries a print timestamp that refreshes on beforeprint without crashing', async () => {
    renderWithQuery(<PrintSheet />);
    expect(screen.getByText(/Printed/)).toBeInTheDocument();
    // jsdom has no print pipeline; the event hook must at least never break.
    act(() => {
      window.dispatchEvent(new Event('beforeprint'));
    });
    expect(await screen.findByText(/Printed/)).toBeInTheDocument();
  });

  it('renders em dashes for steps that are not chosen yet', () => {
    renderWithQuery(<PrintSheet />);
    const sheet = screen.getByText(/Prepared by/).closest('section');
    expect(sheet?.textContent).toContain('—');
  });
});
