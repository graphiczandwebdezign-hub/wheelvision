import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Accordion, SearchBox, Tabs } from '@/components/ui';

describe('SearchBox (debounced)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits the search only after the debounce elapses', () => {
    const onSearch = vi.fn();
    render(<SearchBox label="Search vehicles" onSearch={onSearch} />);
    const input = screen.getByRole('searchbox', { name: 'Search vehicles' });

    // Initial mount emits the empty debounced value once.
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenLastCalledWith('');

    fireEvent.change(input, { target: { value: 'hil' } });
    fireEvent.change(input, { target: { value: 'hilux' } });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(onSearch).toHaveBeenCalledTimes(1); // still within the debounce window

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(onSearch).toHaveBeenLastCalledWith('hilux');
  });

  it('clears via the clear button and restores focus', () => {
    const onSearch = vi.fn();
    render(<SearchBox label="Search vehicles" onSearch={onSearch} />);
    const input = screen.getByRole('searchbox') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'hilux' } });
    fireEvent.click(screen.getByRole('button', { name: 'Clear search vehicles' }));

    expect(input.value).toBe('');
    expect(document.activeElement).toBe(input);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(onSearch).toHaveBeenLastCalledWith('');
  });

  it('Escape clears the input instead of bubbling to dialogs', () => {
    const onParentKeyDown = vi.fn();
    render(
      <div onKeyDown={onParentKeyDown}>
        <SearchBox label="Search wheels" onSearch={() => undefined} />
      </div>,
    );
    const input = screen.getByRole('searchbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'te37' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(input.value).toBe('');
    expect(onParentKeyDown).not.toHaveBeenCalled(); // propagation stopped
  });
});

describe('Tabs (WAI-ARIA tabs pattern)', () => {
  const items = [
    { value: 'visual', label: 'Visual', content: <p>visual panel</p> },
    { value: 'details', label: 'Details', content: <p>details panel</p> },
    { value: 'history', label: 'History', content: <p>history panel</p> },
  ];

  it('renders tablist roles with roving tabindex', () => {
    render(<Tabs label="Preview views" items={items} />);
    const tabs = screen.getAllByRole('tab');
    expect(screen.getByRole('tablist', { name: 'Preview views' })).toBeInTheDocument();
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveAttribute('tabindex', '0');
    expect(tabs[1]).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('visual panel');
  });

  it('switches panels on click and reports controlled changes', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Tabs label="Preview views" items={items} onChange={onChange} />);

    await user.click(screen.getByRole('tab', { name: 'Details' }));
    expect(onChange).toHaveBeenCalledWith('details');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('details panel');
  });

  it('arrow keys move focus and selection with wrap-around', async () => {
    const user = userEvent.setup();
    render(<Tabs label="Preview views" items={items} />);
    const first = screen.getByRole('tab', { name: 'Visual' });
    first.focus();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Details' })).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('details panel');

    await user.keyboard('{ArrowRight}');
    await user.keyboard('{ArrowRight}'); // wraps to start
    expect(first).toHaveFocus();

    await user.keyboard('{ArrowLeft}'); // wraps to end
    expect(screen.getByRole('tab', { name: 'History' })).toHaveFocus();

    await user.keyboard('{Home}');
    expect(first).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'History' })).toHaveFocus();
  });

  it('associates tabs to panels both ways', () => {
    render(<Tabs label="Preview views" items={items} />);
    const tab = screen.getByRole('tab', { name: 'Visual' });
    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveAttribute('aria-labelledby', tab.id);
    expect(tab).toHaveAttribute('aria-controls', panel.id);
  });
});

describe('Accordion', () => {
  const items = [
    { id: 'vehicle', title: 'Vehicle', content: <p>vehicle content</p>, defaultOpen: true },
    { id: 'wheels', title: 'Wheels', content: <p>wheels content</p> },
  ];

  it('opens default items and wires aria-expanded to regions', () => {
    render(<Accordion items={items} />);
    const vehicleHeader = screen.getByRole('button', { name: /Vehicle/ });
    const wheelsHeader = screen.getByRole('button', { name: /Wheels/ });

    expect(vehicleHeader).toHaveAttribute('aria-expanded', 'true');
    expect(wheelsHeader).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('region', { name: /Vehicle/ })).toHaveTextContent('vehicle content');
    expect(screen.queryByText('wheels content')).not.toBeInTheDocument();
  });

  it('toggles sections with Space/Enter while staying in tab order', async () => {
    const user = userEvent.setup();
    render(<Accordion items={items} />);
    const wheelsHeader = screen.getByRole('button', { name: /Wheels/ });

    wheelsHeader.focus();
    await user.keyboard('{Enter}');
    expect(wheelsHeader).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('wheels content')).toBeInTheDocument();

    await user.keyboard(' ');
    expect(wheelsHeader).toHaveAttribute('aria-expanded', 'false');
  });
});
