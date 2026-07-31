import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Combobox, COMBOBOX_MAX_VISIBLE_OPTIONS, type ComboOption } from '@/components/ui';

const options: ComboOption[] = [
  { value: 'toyota', label: 'Toyota' },
  { value: 'ford', label: 'Ford' },
  { value: 'vw', label: 'Volkswagen', keywords: 'VW Amarok' },
];

function setup(overrides: Partial<Parameters<typeof Combobox>[0]> = {}) {
  const onChange = vi.fn();
  const utils = render(
    <Combobox
      label="Manufacturer"
      options={options}
      value={null}
      onChange={onChange}
      {...overrides}
    />,
  );
  return { onChange, ...utils };
}

describe('Combobox — interaction', () => {
  it('opens on focus and lists every option', async () => {
    const user = userEvent.setup();
    setup();
    const input = screen.getByRole('combobox', { name: 'Manufacturer' });
    await user.click(input);

    const listbox = screen.getByRole('listbox', { name: 'Manufacturer' });
    expect(within(listbox).getAllByRole('option')).toHaveLength(3);
    expect(input).toHaveAttribute('aria-expanded', 'true');
  });

  it('filters instantly by label and keywords while typing', async () => {
    const user = userEvent.setup();
    setup();
    const input = screen.getByRole('combobox', { name: 'Manufacturer' });
    await user.click(input);
    await user.type(input, 'amarok');

    const listbox = screen.getByRole('listbox');
    expect(within(listbox).getAllByRole('option')).toHaveLength(1);
    expect(within(listbox).getByRole('option', { name: 'Volkswagen' })).toBeInTheDocument();
  });

  it('selects with the mouse', async () => {
    const user = userEvent.setup();
    const { onChange } = setup();
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Ford' }));

    expect(onChange).toHaveBeenCalledWith('ford');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows the selected label when closed', () => {
    setup({ value: 'toyota' });
    const input = screen.getByRole('combobox') as HTMLInputElement;
    expect(input.value).toBe('Toyota');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('clears the value via the clear affordance', async () => {
    const user = userEvent.setup();
    const { onChange } = setup({ value: 'ford' });
    await user.click(screen.getByRole('button', { name: 'Clear manufacturer' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('renders the empty message when nothing matches', async () => {
    const user = userEvent.setup();
    setup({ emptyMessage: 'No makes match' });
    await user.click(screen.getByRole('combobox'));
    await user.type(screen.getByRole('combobox'), 'zzz');
    expect(screen.getByText('No makes match')).toBeInTheDocument();
  });

  it('stays closed when disabled', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    setup({ disabled: true });
    const input = screen.getByRole('combobox');
    expect(input).toBeDisabled();
    await user.click(input);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('caps the rendered list and explains how to narrow it', async () => {
    const user = userEvent.setup();
    const many: ComboOption[] = Array.from(
      { length: COMBOBOX_MAX_VISIBLE_OPTIONS + 12 },
      (_, i) => ({
        value: `make-${i}`,
        label: `Make ${i}`,
      }),
    );
    setup({ options: many });
    await user.click(screen.getByRole('combobox'));

    expect(screen.getAllByRole('option')).toHaveLength(COMBOBOX_MAX_VISIBLE_OPTIONS);
    expect(screen.getByText(/12 more — keep typing/)).toBeInTheDocument();
  });
});

describe('Combobox — keyboard navigation (ARIA combobox pattern)', () => {
  it('ArrowDown/ArrowUp move the active option via aria-activedescendant', async () => {
    const user = userEvent.setup();
    setup();
    const input = screen.getByRole('combobox');
    await user.click(input);

    await user.keyboard('{ArrowDown}');
    const listbox = screen.getByRole('listbox');
    const firstActive = input.getAttribute('aria-activedescendant');
    expect(firstActive).toBe(`${listbox.id}-0`);
    expect(document.getElementById(firstActive as string)).toHaveTextContent('Toyota');

    await user.keyboard('{ArrowDown}');
    expect(input.getAttribute('aria-activedescendant')).toBe(`${listbox.id}-1`);

    await user.keyboard('{ArrowUp}');
    expect(input.getAttribute('aria-activedescendant')).toBe(`${listbox.id}-0`);
  });

  it('wraps around at the list boundaries', async () => {
    const user = userEvent.setup();
    setup();
    const input = screen.getByRole('combobox');
    await user.click(input);

    await user.keyboard('{ArrowUp}'); // from none → last
    const listbox = screen.getByRole('listbox');
    expect(input.getAttribute('aria-activedescendant')).toBe(`${listbox.id}-2`);

    await user.keyboard('{ArrowDown}'); // wraps → first
    expect(input.getAttribute('aria-activedescendant')).toBe(`${listbox.id}-0`);
  });

  it('Enter selects the active option and closes', async () => {
    const user = userEvent.setup();
    const { onChange } = setup();
    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    expect(onChange).toHaveBeenCalledWith('ford');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('Enter on a unique filtered match selects it directly', async () => {
    const user = userEvent.setup();
    const { onChange } = setup();
    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.type(input, 'amarok');
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('vw');
  });

  it('Escape closes without changing the value', async () => {
    const user = userEvent.setup();
    const { onChange } = setup({ value: 'toyota' });
    const input = screen.getByRole('combobox') as HTMLInputElement;
    await user.click(input);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe('Toyota'); // selection display restored
  });

  it('Home/End jump to the list edges', async () => {
    const user = userEvent.setup();
    setup();
    const input = screen.getByRole('combobox');
    await user.click(input);
    const listbox = screen.getByRole('listbox');

    await user.keyboard('{End}');
    expect(input.getAttribute('aria-activedescendant')).toBe(`${listbox.id}-2`);
    await user.keyboard('{Home}');
    expect(input.getAttribute('aria-activedescendant')).toBe(`${listbox.id}-0`);
  });

  it('marks the selected option with aria-selected', async () => {
    const user = userEvent.setup();
    setup({ value: 'ford' });
    await user.click(screen.getByRole('combobox'));
    expect(screen.getByRole('option', { name: 'Ford' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: 'Toyota' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('exposes every option at touch-friendly height', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('combobox'));
    for (const option of screen.getAllByRole('option')) {
      expect(option.className).toContain('min-h-11');
    }
  });
});
