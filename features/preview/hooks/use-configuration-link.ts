'use client';

import { useEffect, useState } from 'react';
import { toast } from '@/components/ui';
import {
  buildConfigurationUrl,
  CONFIG_LINK_PARAM,
  parseConfigurationLink,
} from '@/features/preview/state/configuration-link';
import { usePreviewStore, type PreviewSelection } from '@/features/preview/state/preview-store';

/**
 * Consumes a shared configuration link once on mount: a valid `?config=`
 * payload takes precedence over the persisted (localStorage) selection, then
 * the parameter is removed from the address bar so refreshes stay clean.
 * Malformed/foreign links are ignored silently — the store keeps its state.
 */
export function useConfigurationLinkSync(): void {
  const restoreConfiguration = usePreviewStore((state) => state.restoreConfiguration);
  const [consumed, setConsumed] = useState(false);

  useEffect(() => {
    if (consumed || typeof window === 'undefined') {
      return;
    }
    const selection = parseConfigurationLink(window.location.search);
    if (selection) {
      restoreConfiguration(selection);
      const url = new URL(window.location.href);
      url.searchParams.delete(CONFIG_LINK_PARAM);
      window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
      toast({ kind: 'success', message: 'Configuration loaded from shared link.' });
    }
    setConsumed(true);
  }, [consumed, restoreConfiguration]);
}

/**
 * Copies the share link for the current selection to the clipboard.
 * Resolves false (never throws) so the caller can notify without crashing
 * the kiosk — older browsers and permission denials are expected.
 */
export async function copyConfigurationLink(selection: PreviewSelection): Promise<boolean> {
  const base =
    typeof window === 'undefined'
      ? 'https://wheelvision.app/preview'
      : `${window.location.origin}${window.location.pathname}`;
  const url = buildConfigurationUrl(selection, base);
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
