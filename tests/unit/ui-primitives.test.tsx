import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  Panel,
  Select,
  Sidebar,
  Toolbar,
} from '@/components/ui';

describe('Button', () => {
  it('renders variants and sizes with touch-friendly heights', () => {
    render(
      <>
        <Button>Save</Button>
        <Button variant="danger" size="sm">
          Remove
        </Button>
      </>,
    );
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save.className).toContain('bg-cyan-500');
    expect(save.className).toContain('min-h-11');
    expect(screen.getByRole('button', { name: 'Remove' }).className).toContain(
      'border-rose-900/60',
    );
  });

  it('shows a busy spinner while loading and blocks interaction', () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('is disabled when asked and exposes the shared focus ring', () => {
    render(<Button disabled>Nope</Button>);
    const button = screen.getByRole('button', { name: 'Nope' });
    expect(button).toBeDisabled();
    expect(button.className).toContain('focus-visible:ring-2');
  });
});

describe('Select', () => {
  it('associates its label and maps blank to null', () => {
    const onChange = vi.fn();
    render(
      <Select
        label="Finish"
        placeholder="Select finish"
        value={null}
        options={[
          { value: 'mb', label: 'Matte Black' },
          { value: 'br', label: 'Bronze' },
        ]}
        onChange={onChange}
      />,
    );
    const select = screen.getByLabelText('Finish');
    fireEvent.change(select, { target: { value: 'br' } });
    expect(onChange).toHaveBeenCalledWith('br');
    fireEvent.change(select, { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('supports an aria-label override and disabled options', () => {
    render(
      <Select
        label="Diameter"
        aria-label="Filter sizes by diameter"
        placeholder="All"
        value={null}
        options={[{ value: '18', label: '18″', disabled: true }]}
        onChange={() => undefined}
      />,
    );
    expect(screen.getByLabelText('Filter sizes by diameter')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '18″' })).toBeDisabled();
  });
});

describe('Surface primitives', () => {
  it('Card renders title, subtitle and actions', () => {
    render(
      <Card title="Hilux" subtitle="Silver" actions={<Badge tone="accent">meta</Badge>}>
        body
      </Card>,
    );
    expect(screen.getByRole('heading', { name: 'Hilux' })).toBeInTheDocument();
    expect(screen.getByText('Silver')).toBeInTheDocument();
    expect(screen.getByText('meta')).toBeInTheDocument();
    expect(screen.getByText('body')).toBeInTheDocument();
  });

  it('Panel labels its region for screen readers', () => {
    render(<Panel title="Vehicle">content</Panel>);
    const heading = screen.getByRole('heading', { name: 'Vehicle' });
    expect(heading.id).not.toBe('');
    // The wrapping section is labelled by the heading id.
    expect(heading.closest('section')).toHaveAttribute('aria-labelledby', heading.id);
  });

  it('Sidebar is a labelled aside with a footer slot', () => {
    render(
      <Sidebar title="Configure" footer={<span>footer</span>}>
        body
      </Sidebar>,
    );
    expect(screen.getByRole('complementary')).toBeInTheDocument();
    expect(screen.getByText('body')).toBeInTheDocument();
    expect(screen.getByText('footer')).toBeInTheDocument();
  });

  it('Toolbar exposes role, label and slots', () => {
    render(
      <Toolbar label="Preview toolbar" start={<span>brand</span>} end={<span>status</span>} />,
    );
    expect(screen.getByRole('toolbar', { name: 'Preview toolbar' })).toBeInTheDocument();
    expect(screen.getByText('brand')).toBeInTheDocument();
    expect(screen.getByText('status')).toBeInTheDocument();
  });

  it('Badge renders every tone', () => {
    render(
      <>
        <Badge tone="success">ok</Badge>
        <Badge tone="warning">warn</Badge>
      </>,
    );
    expect(screen.getByText('ok').className).toContain('border-emerald-800');
    expect(screen.getByText('warn').className).toContain('border-amber-800');
  });
});

describe('State primitives', () => {
  it('LoadingSkeleton is decorative (aria-hidden) with the requested line count', () => {
    const { container } = render(<LoadingSkeleton lines={5} />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelectorAll('[class*="bg-slate-800"]').length).toBe(5);
  });

  it('EmptyState renders guidance and an action', () => {
    render(
      <EmptyState
        title="No vehicles"
        description="Publish one first."
        action={<Button>Go</Button>}
      />,
    );
    expect(screen.getByText('No vehicles')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument();
  });

  it('ErrorState announces itself with role=alert and retries via callback', () => {
    const onRetry = vi.fn();
    render(<ErrorState title="Catalog unavailable" onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Catalog unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('ErrorState omits the retry button without a handler', () => {
    render(<ErrorState title="Failed" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
