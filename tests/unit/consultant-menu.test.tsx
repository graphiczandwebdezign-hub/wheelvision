import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConsultantMenu } from '@/features/preview/components/consultant-menu';
import {
  createLocalConsultantProfileStorage,
  MAX_CONSULTANT_PROFILES,
  type ConsultantProfileStorage,
} from '@/features/preview/state/consultant-profiles';
import { useConsultantStore } from '@/features/preview/state/consultant-store';
import type { KeyValueStorage } from '@/features/preview/state/key-value-storage';
import { resetToastIds, useToastStore } from '@/components/ui/toast-store';

function memoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

function resetStore(storage: ConsultantProfileStorage): ConsultantProfileStorage {
  useConsultantStore.setState({ storage, profiles: [], activeId: null, hydrated: false });
  return storage;
}

function toasts(): readonly { kind: string; message: string }[] {
  return useToastStore.getState().toasts;
}

describe('ConsultantMenu', () => {
  beforeEach(() => {
    useToastStore.getState().clear();
    resetToastIds();
    resetStore(createLocalConsultantProfileStorage(memoryStorage()));
    useConsultantStore.getState().hydrate();
  });

  it('defaults to the shared showroom list', () => {
    render(<ConsultantMenu />);
    expect(screen.getByRole('button', { name: 'Consultant profile menu' })).toHaveTextContent(
      'Showroom',
    );
  });

  it('creates a profile, activates it straight away and reflects it on the trigger', async () => {
    const user = userEvent.setup();
    render(<ConsultantMenu />);
    await user.click(screen.getByRole('button', { name: 'Consultant profile menu' }));

    await user.type(screen.getByLabelText('New profile name'), '  Thandi  ');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(useConsultantStore.getState().profiles.map((profile) => profile.name)).toEqual([
      'Thandi',
    ]);
    expect(useConsultantStore.getState().activeId).toBe(
      useConsultantStore.getState().profiles[0].id,
    );
    expect(toasts().some((t) => t.kind === 'success' && t.message.includes('Thandi'))).toBe(true);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Consultant profile menu' })).toHaveTextContent(
        'Thandi',
      ),
    );
  });

  it('rejects duplicate names with an explanation', async () => {
    const storage = useConsultantStore.getState().storage;
    storage.create('Thandi');
    useConsultantStore.getState().hydrate();

    const user = userEvent.setup();
    render(<ConsultantMenu />);
    await user.click(screen.getByRole('button', { name: 'Consultant profile menu' }));
    await user.type(screen.getByLabelText('New profile name'), ' thandi ');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(toasts().some((t) => t.kind === 'error' && t.message.includes('already exists'))).toBe(
      true,
    );
    expect(useConsultantStore.getState().profiles).toHaveLength(1);
  });

  it('switches between profiles and back to the showroom list', async () => {
    const storage = useConsultantStore.getState().storage;
    storage.create('Thandi');
    storage.create('Pieter');
    useConsultantStore.getState().hydrate();

    const user = userEvent.setup();
    render(<ConsultantMenu />);
    await user.click(screen.getByRole('button', { name: 'Consultant profile menu' }));

    await user.click(screen.getByRole('button', { name: 'Switch to profile Thandi' }));
    expect(useConsultantStore.getState().activeId).toBe(
      useConsultantStore.getState().profiles[0].id,
    );

    await user.click(screen.getByRole('button', { name: 'Switch to the shared showroom list' }));
    expect(useConsultantStore.getState().activeId).toBeNull();
  });

  it('renames a profile inline; Escape cancels without writing', async () => {
    const storage = useConsultantStore.getState().storage;
    storage.create('Thandi');
    useConsultantStore.getState().hydrate();

    const user = userEvent.setup();
    render(<ConsultantMenu />);
    await user.click(screen.getByRole('button', { name: 'Consultant profile menu' }));
    await user.click(screen.getByRole('button', { name: 'Rename profile Thandi' }));

    const input = screen.getByLabelText('Profile name');
    await user.clear(input);
    await user.type(input, 'Thandi M');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(useConsultantStore.getState().profiles[0].name).toBe('Thandi M');

    // Cancel path: start renaming, then Escape.
    await user.click(screen.getByRole('button', { name: 'Rename profile Thandi M' }));
    const again = screen.getByLabelText('Profile name');
    await user.clear(again);
    await user.type(again, 'Discarded');
    fireEvent.keyDown(again, { key: 'Escape' });
    expect(useConsultantStore.getState().profiles[0].name).toBe('Thandi M');
  });

  it('rejects duplicate renames', async () => {
    const storage = useConsultantStore.getState().storage;
    storage.create('Thandi');
    storage.create('Pieter');
    useConsultantStore.getState().hydrate();

    const user = userEvent.setup();
    render(<ConsultantMenu />);
    await user.click(screen.getByRole('button', { name: 'Consultant profile menu' }));
    await user.click(screen.getByRole('button', { name: 'Rename profile Pieter' }));
    const input = screen.getByLabelText('Profile name');
    await user.clear(input);
    await user.type(input, ' thandi ');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(toasts().some((t) => t.kind === 'error' && t.message.includes('already exists'))).toBe(
      true,
    );
    expect(useConsultantStore.getState().profiles.map((p) => p.name)).toEqual(['Thandi', 'Pieter']);
  });

  it('removing the active profile returns the device to the showroom list', async () => {
    const storage = useConsultantStore.getState().storage;
    storage.create('Thandi');
    const id = storage.list()[0].id;
    storage.setActive(id);
    useConsultantStore.getState().hydrate();

    const user = userEvent.setup();
    render(<ConsultantMenu />);
    await user.click(screen.getByRole('button', { name: 'Consultant profile menu' }));
    await user.click(screen.getByRole('button', { name: 'Remove profile Thandi' }));

    expect(useConsultantStore.getState().profiles).toHaveLength(0);
    expect(useConsultantStore.getState().activeId).toBeNull();
    expect(
      toasts().some((t) => t.kind === 'info' && t.message.includes('shared showroom list')),
    ).toBe(true);
  });

  it(`enforces the ${MAX_CONSULTANT_PROFILES}-profile limit in the UI`, async () => {
    const storage = useConsultantStore.getState().storage;
    for (let index = 0; index < MAX_CONSULTANT_PROFILES; index += 1) {
      storage.create(`Consultant ${index}`);
    }
    useConsultantStore.getState().hydrate();

    const user = userEvent.setup();
    render(<ConsultantMenu />);
    await user.click(screen.getByRole('button', { name: 'Consultant profile menu' }));

    expect(screen.getByLabelText('New profile name')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    expect(screen.getByText(/Profile limit reached/)).toBeInTheDocument();
  });

  it('announces its popup state and closes on Escape', async () => {
    const user = userEvent.setup();
    render(<ConsultantMenu />);
    const trigger = screen.getByRole('button', { name: 'Consultant profile menu' });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: 'Consultant profiles' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Consultant profiles' })).toBeNull(),
    );
  });
});
