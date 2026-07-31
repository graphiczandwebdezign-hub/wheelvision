'use client';

import { useCallback, useMemo, useState } from 'react';
import { Button, toast } from '@/components/ui';
import { usePreviewSelection } from '@/features/preview/hooks/use-preview-selection';
import { QuoteButton } from '@/features/preview/components/quote-button';
import { copyConfigurationLink } from '@/features/preview/hooks/use-configuration-link';
import { SavedConfigurationsDialog } from '@/features/preview/selection/saved-configurations-dialog';
import {
  getBrowserConfigurationStorage,
  type ConfigurationStorage,
} from '@/features/preview/state/configuration-storage';
import { useConsultantStore } from '@/features/preview/state/consultant-store';
import { usePreviewStore, type PreviewSelection } from '@/features/preview/state/preview-store';
import { useValidationNoticeStore } from '@/features/preview/state/validation-notices';
import { formatTyreProfile } from '@/features/preview/selection/tyre-facets';
import { vehicleDisplayName } from '@/features/preview/selection/vehicle-facets';

export interface ConfigurationSummaryProps {
  readonly storage?: ConfigurationStorage;
  readonly online?: boolean;
}

/** Rows shown in the summary; `null` values render as an em dash. */
function useSummaryRows(selection: ReturnType<typeof usePreviewSelection>) {
  return useMemo(() => {
    const wheelSize =
      selection.wheel?.sizes.find((size) => size.id === selection.wheelSizeId) ?? null;
    const tyreProfile =
      selection.tyre?.profiles.find((profile) => profile.id === selection.tyreProfileId) ?? null;

    return [
      ['Vehicle', selection.vehicle ? vehicleDisplayName(selection.vehicle) : null],
      ['Colour', selection.colour],
      ['Wheel', selection.wheel ? `${selection.wheel.brand} ${selection.wheel.model}` : null],
      ['Finish', selection.wheelFinish],
      ['Size', wheelSize?.size ?? null],
      ['Tyre', selection.tyre ? `${selection.tyre.brand} ${selection.tyre.pattern}` : null],
      ['Profile', tyreProfile ? formatTyreProfile(tyreProfile) : null],
    ] as const;
  }, [selection]);
}

function currentSelectionSnapshot(): PreviewSelection {
  const state = usePreviewStore.getState();
  return {
    vehicleId: state.vehicleId,
    colour: state.colour,
    wheelId: state.wheelId,
    wheelFinish: state.wheelFinish,
    wheelSizeId: state.wheelSizeId,
    tyreId: state.tyreId,
    tyreProfileId: state.tyreProfileId,
  };
}

/**
 * The sidebar footer: the configuration at a glance, reconciliation notices,
 * and the dealer action set — save (scoped to the active consultant), recall,
 * share, print handout, reset, and the Sprint 8 quote workspace entry point.
 * Every action degrades to a toast instead of crashing the kiosk.
 */
export function ConfigurationSummary({ storage, online = true }: ConfigurationSummaryProps) {
  const selection = usePreviewSelection();
  const resetConfiguration = usePreviewStore((state) => state.resetConfiguration);
  const activeStorage = useMemo(() => storage ?? getBrowserConfigurationStorage(), [storage]);
  const rows = useSummaryRows(selection);
  const started = selection.vehicle !== undefined;

  const activeId = useConsultantStore((state) => state.activeId);
  const activeProfile = useConsultantStore((state) =>
    state.profiles.find((profile) => profile.id === state.activeId),
  );

  const noticeBatch = useValidationNoticeStore((state) => state.batch);
  const dismissNotices = useValidationNoticeStore((state) => state.dismiss);

  const [savedOpen, setSavedOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);

  const bumpSaved = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  const onSave = () => {
    setSaving(true);
    try {
      const label = selection.vehicle
        ? vehicleDisplayName(selection.vehicle)
        : 'Unnamed configuration';
      const configuration = activeStorage.save({
        selection: currentSelectionSnapshot(),
        label,
        ownerId: activeId,
      });
      toast({
        kind: 'success',
        message: activeProfile
          ? `Saved “${configuration.label}” to ${activeProfile.name}'s list on this device.`
          : `Saved “${configuration.label}” on this device.`,
      });
      bumpSaved();
    } catch {
      // Storage quota/privacy-mode failures must never break the dealer flow.
      toast({
        kind: 'error',
        message: 'Could not save on this device. The configuration stays in memory.',
      });
    } finally {
      setSaving(false);
    }
  };

  const onShare = async () => {
    setSharing(true);
    try {
      const copied = await copyConfigurationLink(currentSelectionSnapshot());
      if (copied) {
        toast({ kind: 'success', message: 'Share link copied to the clipboard.' });
      } else {
        toast({
          kind: 'error',
          message: 'The clipboard is unavailable — copy the address bar link instead.',
        });
      }
    } finally {
      setSharing(false);
    }
  };

  const onPrint = () => {
    if (typeof window.print !== 'function') {
      toast({
        kind: 'error',
        message: 'Printing is not available in this browser — use the browser menu instead.',
      });
      return;
    }
    window.print();
  };

  return (
    <div className="flex flex-col gap-4" aria-label="Current configuration summary">
      {noticeBatch && noticeBatch.notices.length > 0 ? (
        <section
          aria-label="Catalog adjustments"
          className="flex flex-col gap-2 rounded-xl border border-amber-800/60 bg-amber-950/30 px-3 py-2"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">
            Adjusted to the current catalog
          </p>
          <ul className="flex flex-col gap-1 text-xs text-amber-200/90">
            {noticeBatch.notices.map((notice) => (
              <li key={notice.field}>{notice.message}</li>
            ))}
          </ul>
          <Button variant="ghost" size="sm" onClick={dismissNotices}>
            Dismiss
          </Button>
        </section>
      ) : null}

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-xs uppercase tracking-wider text-slate-500">{label}</dt>
            <dd className={value ? 'text-slate-200' : 'text-slate-600'}>{value ?? '—'}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-2">
        <Button
          variant="secondary"
          fullWidth
          onClick={onSave}
          loading={saving}
          disabled={!online || !started}
          aria-label="Save configuration on this device"
        >
          Save Configuration
        </Button>
        {!online ? (
          <p className="text-center text-xs text-amber-400">
            You are offline — saving is paused until the connection returns.
          </p>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSavedOpen(true)}>
            Saved
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              resetConfiguration();
              toast({ kind: 'info', message: 'Configuration reset.' });
            }}
          >
            Reset
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            onClick={() => void onShare()}
            loading={sharing}
            disabled={!started}
            aria-label="Copy share link"
          >
            Share
          </Button>
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            onClick={onPrint}
            disabled={!started}
            aria-label="Print configuration handout"
          >
            Print
          </Button>
        </div>
        <QuoteButton />
      </div>

      <SavedConfigurationsDialog
        open={savedOpen}
        onClose={() => setSavedOpen(false)}
        storage={activeStorage}
        refreshKey={refreshKey}
        onMutated={bumpSaved}
        ownerScope={activeId}
        profileName={activeProfile?.name ?? null}
      />
    </div>
  );
}
