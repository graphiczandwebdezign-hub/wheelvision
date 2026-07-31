'use client';

import { useRef, useState } from 'react';
import { Badge, Button, Popover, toast } from '@/components/ui';
import { cn } from '@/lib/cn';
import { controlBase, focusRing } from '@/components/ui/styles';
import {
  MAX_CONSULTANT_PROFILES,
  type CreateProfileFailure,
  type RenameProfileFailure,
} from '@/features/preview/state/consultant-profiles';
import { useConsultantStore } from '@/features/preview/state/consultant-store';

const createFailureMessages: Record<CreateProfileFailure, string> = {
  empty: 'Enter a name for the profile first.',
  duplicate: 'A profile with that name already exists.',
  full: `Profile limit reached (${MAX_CONSULTANT_PROFILES}) — remove one first.`,
  storage: 'Could not store profiles on this device.',
};

const renameFailureMessages: Record<RenameProfileFailure, string> = {
  ...createFailureMessages,
  missing: 'That profile no longer exists.',
};

/**
 * Consultant profile menu in the preview toolbar. Profiles are device-local
 * named identities: the active profile owns newly saved configurations, its
 * list is what the Saved dialog shows, and its name goes on the printed
 * handout. "Showroom" is the shared, profile-less default.
 */
export function ConsultantMenu() {
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  const profiles = useConsultantStore((state) => state.profiles);
  const activeId = useConsultantStore((state) => state.activeId);
  const createProfile = useConsultantStore((state) => state.createProfile);
  const renameProfile = useConsultantStore((state) => state.renameProfile);
  const removeProfile = useConsultantStore((state) => state.removeProfile);
  const activateProfile = useConsultantStore((state) => state.activateProfile);

  const activeProfile = profiles.find((profile) => profile.id === activeId) ?? null;
  const limitReached = profiles.length >= MAX_CONSULTANT_PROFILES;
  const inputClasses = cn(controlBase, focusRing, 'min-h-9 min-w-0 flex-1 px-3');

  const activate = (id: string | null, name: string | null) => {
    if (!activateProfile(id)) {
      toast({ kind: 'error', message: 'Could not store profiles on this device.' });
      return;
    }
    setEditingId(null);
    toast({
      kind: 'success',
      message:
        id === null
          ? 'Using the shared showroom list.'
          : `Working as “${name ?? ''}” — saves go to their list.`,
    });
  };

  const onCreate = () => {
    const result = createProfile(draft);
    if (!result.ok) {
      toast({ kind: 'error', message: createFailureMessages[result.reason] });
      return;
    }
    setDraft('');
    activateProfile(result.profile.id);
    toast({
      kind: 'success',
      message: `Profile “${result.profile.name}” ready — you're working as ${result.profile.name}.`,
    });
  };

  const commitRename = (id: string) => {
    const result = renameProfile(id, renameDraft);
    if (!result.ok) {
      toast({ kind: 'error', message: renameFailureMessages[result.reason] });
      return;
    }
    setEditingId(null);
    setRenameDraft('');
    toast({ kind: 'success', message: 'Profile renamed.' });
  };

  const onRemove = (id: string, name: string) => {
    const wasActive = id === activeId;
    if (!removeProfile(id)) {
      toast({ kind: 'error', message: 'Could not store profiles on this device.' });
      return;
    }
    if (editingId === id) {
      setEditingId(null);
    }
    toast({
      kind: 'info',
      message: wasActive
        ? `Removed “${name}” — back to the shared showroom list.`
        : `Profile “${name}” removed.`,
    });
  };

  return (
    <>
      <Button
        ref={anchorRef}
        variant="ghost"
        size="sm"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Consultant profile menu"
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true">👤</span>
        <span className="max-w-32 truncate">{activeProfile ? activeProfile.name : 'Showroom'}</span>
        <span aria-hidden="true">▾</span>
      </Button>
      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        label="Consultant profiles"
        className="w-80"
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Consultant profiles
            </p>
            <Badge tone={activeProfile ? 'success' : 'neutral'}>
              {activeProfile ? 'Profile active' : 'Shared list'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            Stored on this device only. The active profile owns new saves and signs the printed
            handout.
          </p>

          <ul className="flex max-h-56 flex-col gap-2 overflow-y-auto">
            <li className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-200">Showroom</p>
                <p className="text-xs text-slate-500">Shared device list</p>
              </div>
              {activeId === null ? (
                <Badge tone="success">Active</Badge>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Switch to the shared showroom list"
                  onClick={() => activate(null, null)}
                >
                  Use
                </Button>
              )}
            </li>
            {profiles.map((profile) => (
              <li
                key={profile.id}
                className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2"
              >
                {editingId === profile.id ? (
                  <form
                    className="flex items-center gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      commitRename(profile.id);
                    }}
                  >
                    <label htmlFor={`profile-rename-${profile.id}`} className="sr-only">
                      Profile name
                    </label>
                    <input
                      id={`profile-rename-${profile.id}`}
                      autoFocus
                      value={renameDraft}
                      onChange={(event) => setRenameDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') {
                          event.stopPropagation();
                          setEditingId(null);
                          setRenameDraft('');
                        }
                      }}
                      className={inputClasses}
                    />
                    <Button type="submit" size="sm" variant="secondary">
                      Save
                    </Button>
                  </form>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-medium text-slate-200">
                      {profile.name}
                    </p>
                    {profile.id === activeId ? <Badge tone="success">Active</Badge> : null}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {profile.id !== activeId ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      aria-label={`Switch to profile ${profile.name}`}
                      onClick={() => activate(profile.id, profile.name)}
                    >
                      Use
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Rename profile ${profile.name}`}
                    onClick={() => {
                      setEditingId(profile.id);
                      setRenameDraft(profile.name);
                    }}
                  >
                    Rename
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    aria-label={`Remove profile ${profile.name}`}
                    onClick={() => onRemove(profile.id, profile.name)}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              onCreate();
            }}
          >
            <label htmlFor="new-profile-name" className="sr-only">
              New profile name
            </label>
            <input
              id="new-profile-name"
              value={draft}
              placeholder="Add a consultant…"
              disabled={limitReached}
              onChange={(event) => setDraft(event.target.value)}
              className={inputClasses}
            />
            <Button
              type="submit"
              size="sm"
              variant="secondary"
              disabled={limitReached || draft.trim().length === 0}
            >
              Add
            </Button>
          </form>
          {limitReached ? (
            <p className="text-xs text-amber-400">
              Profile limit reached ({MAX_CONSULTANT_PROFILES}) — remove one to add another.
            </p>
          ) : null}
        </div>
      </Popover>
    </>
  );
}
