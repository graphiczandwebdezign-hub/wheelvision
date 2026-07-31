'use client';

import { useState } from 'react';
import { Badge, Button, Dialog, EmptyState, toast } from '@/components/ui';
import { cn } from '@/lib/cn';
import { controlBase, focusRing } from '@/components/ui/styles';
import type { ConfigurationStorage } from '@/features/preview/state/configuration-storage';
import { usePreviewStore } from '@/features/preview/state/preview-store';

export interface SavedConfigurationsDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly storage: ConfigurationStorage;
  /** Bumped after every mutation so the list stays live while open. */
  readonly refreshKey: number;
  readonly onMutated: () => void;
  /**
   * Which list to show: omitted = every configuration, `null` = the shared
   * device pool, profile id = that consultant's list.
   */
  readonly ownerScope?: string | null;
  /** Active consultant's name, used to personalise the dialog copy. */
  readonly profileName?: string | null;
}

/**
 * Saved-configuration management: recall (Load), rename and remove entries
 * stored on this device, scoped to the active consultant profile (or the
 * shared showroom pool). Recall restores the selection atomically — the
 * canvas and every panel update in one store write.
 */
export function SavedConfigurationsDialog({
  open,
  onClose,
  storage,
  refreshKey,
  onMutated,
  ownerScope,
  profileName,
}: SavedConfigurationsDialogProps) {
  const restoreConfiguration = usePreviewStore((state) => state.restoreConfiguration);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const saved = open || refreshKey > 0 ? storage.list(ownerScope) : [];

  const commitRename = (id: string) => {
    storage.rename(id, draft);
    setEditingId(null);
    setDraft('');
    onMutated();
    toast({ kind: 'success', message: 'Configuration renamed.' });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Saved configurations"
      description={
        profileName
          ? `Stored on this device under “${profileName}” — dealer accounts arrive with the backend sync.`
          : 'Stored on this device in the shared showroom pool — dealer accounts arrive with the backend sync.'
      }
    >
      {saved.length === 0 ? (
        <EmptyState
          title="Nothing saved yet"
          description={
            profileName
              ? `Save the current configuration to ${profileName}'s list to recall it during the customer consultation.`
              : 'Save the current configuration to recall it during the customer consultation.'
          }
        />
      ) : (
        <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
          {saved.map((configuration) => (
            <li
              key={configuration.id}
              className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3"
            >
              {editingId === configuration.id ? (
                <form
                  className="flex items-center gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    commitRename(configuration.id);
                  }}
                >
                  <label htmlFor={`rename-${configuration.id}`} className="sr-only">
                    Configuration name
                  </label>
                  <input
                    id={`rename-${configuration.id}`}
                    autoFocus
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        event.stopPropagation();
                        setEditingId(null);
                        setDraft('');
                      }
                    }}
                    className={cn(controlBase, focusRing, 'min-h-9 min-w-0 flex-1 px-3')}
                  />
                  <Button type="submit" size="sm" variant="secondary">
                    Save
                  </Button>
                </form>
              ) : (
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-200">
                    {configuration.label}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(configuration.savedAt).toLocaleString()}
                  </p>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  aria-label={`Load ${configuration.label}`}
                  onClick={() => {
                    restoreConfiguration(configuration.selection);
                    onClose();
                    toast({ kind: 'success', message: `Loaded “${configuration.label}”.` });
                  }}
                >
                  Load
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Rename ${configuration.label}`}
                  onClick={() => {
                    setEditingId(configuration.id);
                    setDraft(configuration.label);
                  }}
                >
                  Rename
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  aria-label={`Remove ${configuration.label}`}
                  onClick={() => {
                    storage.remove(configuration.id);
                    if (editingId === configuration.id) {
                      setEditingId(null);
                    }
                    onMutated();
                    toast({ kind: 'info', message: 'Saved configuration removed.' });
                  }}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex items-center gap-2">
        <Badge tone="neutral">{saved.length} saved</Badge>
      </div>
    </Dialog>
  );
}
