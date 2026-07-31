import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRef } from 'react';
import {
  Dialog,
  Popover,
  toast,
  ToastViewport,
  useToastStore,
  resetToastIds,
  DEFAULT_TOAST_DURATION_MS,
} from '@/components/ui';

describe('Dialog', () => {
  it('renders nothing while closed', () => {
    render(
      <Dialog open={false} onClose={() => undefined} title="Saved">
        body
      </Dialog>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders a labelled, modal dialog when open', () => {
    render(
      <Dialog open onClose={() => undefined} title="Saved configurations" description="Device only">
        body text
      </Dialog>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(
      within(dialog).getByRole('heading', { name: 'Saved configurations' }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('body text')).toBeInTheDocument();
    expect(within(dialog).getByText('Device only')).toBeInTheDocument();
  });

  it('moves focus into the dialog and returns it to the trigger on close', () => {
    function Harness({ open }: { open: boolean }) {
      return (
        <>
          <button type="button">trigger</button>
          <Dialog open={open} onClose={() => undefined} title="Focus">
            {null}
          </Dialog>
        </>
      );
    }
    const { rerender } = render(<Harness open={false} />);
    const trigger = screen.getByRole('button', { name: 'trigger' });
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    rerender(<Harness open />);
    const dialog = screen.getByRole('dialog');
    expect(document.activeElement).toBe(dialog);

    rerender(<Harness open={false} />);
    expect(document.activeElement).toBe(trigger);
  });

  it('Escape closes the dialog', () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="Escapable">
        body
      </Dialog>,
    );
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicking the overlay closes; clicking inside does not', () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="Overlay">
        <p>inside</p>
      </Dialog>,
    );
    fireEvent.click(screen.getByText('inside'));
    expect(onClose).not.toHaveBeenCalled();

    const overlay = screen.getByRole('dialog').parentElement as HTMLElement;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('Popover', () => {
  function Harness({ onClose }: { onClose: () => void }) {
    const anchorRef = useRef<HTMLButtonElement | null>(null);
    return (
      <div style={{ position: 'relative' }}>
        <button ref={anchorRef} type="button">
          anchor
        </button>
        <Popover open onClose={onClose} anchorRef={anchorRef} label="Details">
          popover body
        </Popover>
      </div>
    );
  }

  it('renders content while open and closes on Escape', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    expect(screen.getByRole('dialog', { name: 'Details' })).toHaveTextContent('popover body');
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when pressing outside the panel and anchor', () => {
    const onClose = vi.fn();
    render(
      <>
        <span data-testid="outside">outside</span>
        <Harness onClose={onClose} />
      </>,
    );
    fireEvent.pointerDown(screen.getByTestId('outside'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('Toast system', () => {
  beforeEach(() => {
    useToastStore.getState().clear();
    resetToastIds();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores defaults and dismisses by id', () => {
    const id = toast({ message: 'Saved.' });
    const stored = useToastStore.getState().toasts[0];
    expect(stored.kind).toBe('info');
    expect(stored.durationMs).toBe(DEFAULT_TOAST_DURATION_MS);

    useToastStore.getState().dismiss(id);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('renders every toast in the viewport with polite announcements', () => {
    render(<ToastViewport />);
    act(() => {
      toast({ kind: 'success', message: 'Configuration saved.' });
      toast({ kind: 'warning', message: 'You are offline.' });
    });

    expect(screen.getByLabelText('Notifications')).toHaveAttribute('aria-live', 'polite');
    const statuses = screen.getAllByRole('status');
    expect(statuses).toHaveLength(2);
    expect(statuses[0]).toHaveTextContent('Configuration saved.');
    expect(statuses[1].className).toContain('border-amber-800');
  });

  it('auto-dismisses after the duration', () => {
    render(<ToastViewport />);
    act(() => {
      toast({ message: 'Gone soon.', durationMs: 1000 });
    });
    expect(screen.getByRole('status')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('durationMs=null keeps the toast until dismissed manually', () => {
    render(<ToastViewport />);
    act(() => {
      toast({ kind: 'warning', message: 'Offline', durationMs: null });
    });
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByRole('status')).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
