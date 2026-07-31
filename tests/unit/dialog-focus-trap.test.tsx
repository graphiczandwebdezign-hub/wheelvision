import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Dialog } from '@/components/ui';

describe('Dialog focus containment', () => {
  function Harness() {
    return (
      <Dialog open onClose={() => undefined} title="Trap">
        <button type="button">first</button>
        <button type="button">middle</button>
        <button type="button">last</button>
      </Dialog>
    );
  }

  it('Tab wraps from the last focusable to the first', () => {
    render(<Harness />);
    const dialog = screen.getByRole('dialog');
    const last = within(dialog).getByRole('button', { name: 'last' });
    const close = within(dialog).getByRole('button', { name: 'Close dialog' });

    last.focus();
    fireEvent.keyDown(document.activeElement as Element, { key: 'Tab' });
    expect(document.activeElement).toBe(close);

    close.focus();
    fireEvent.keyDown(document.activeElement as Element, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('Tab with no focusable content stays contained in the dialog', () => {
    render(
      <Dialog open onClose={() => undefined} title="Empty">
        <p>no controls</p>
      </Dialog>,
    );
    const dialog = screen.getByRole('dialog');
    // The close button always exists; focus it and tab to verify wrap.
    const close = within(dialog).getByRole('button', { name: 'Close dialog' });
    close.focus();
    fireEvent.keyDown(close, { key: 'Tab' });
    expect(dialog.contains(document.activeElement)).toBe(true);
  });
});
