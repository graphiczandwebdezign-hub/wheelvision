import { z } from 'zod';
import type { PreviewSelection } from '@/features/preview/state/preview-store';

/**
 * Shareable configuration links.
 *
 * The whole selection serialises into one `?config=` query parameter
 * (URL-safe base64 of a small versioned JSON envelope). Links are treated as
 * an untrusted external boundary: parsing is zod-validated, version-pinned
 * and total — a malformed or future-foreign link yields `null` and is simply
 * ignored (the store keeps its persisted state).
 */

export const CONFIG_LINK_PARAM = 'config';
export const CONFIG_LINK_VERSION = 1;

const nullableString = z.union([z.string(), z.null()]);

// Strict: unknown keys come from a foreign/future payload — reject the link.
const sharedSelectionSchema = z
  .object({
    vehicleId: nullableString,
    colour: nullableString,
    wheelId: nullableString,
    wheelFinish: nullableString,
    wheelSizeId: nullableString,
    tyreId: nullableString,
    tyreProfileId: nullableString,
  })
  .strict();

const sharedConfigurationSchema = z.object({
  v: z.literal(CONFIG_LINK_VERSION),
  s: sharedSelectionSchema,
});

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function fromBase64Url(token: string): string {
  const base64 = token.replaceAll('-', '+').replaceAll('_', '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new TextDecoder().decode(bytes);
}

/** Serialise a selection to the compact `config` token. */
export function serialiseConfiguration(selection: PreviewSelection): string {
  return toBase64Url(JSON.stringify({ v: CONFIG_LINK_VERSION, s: selection }));
}

/**
 * Extract and validate a selection from a URL query string
 * (`window.location.search`). Returns `null` when the param is absent,
 * malformed or from an incompatible version.
 */
export function parseConfigurationLink(search: string): PreviewSelection | null {
  const token = new URLSearchParams(search).get(CONFIG_LINK_PARAM);
  if (!token) {
    return null;
  }
  try {
    const parsed = sharedConfigurationSchema.safeParse(JSON.parse(fromBase64Url(token)));
    return parsed.success ? parsed.data.s : null;
  } catch {
    return null;
  }
}

/** Absolute (or base-relative) share URL carrying the selection. */
export function buildConfigurationUrl(
  selection: PreviewSelection,
  baseUrl = 'https://wheelvision.app/preview',
): string {
  const url = new URL(baseUrl);
  url.searchParams.set(CONFIG_LINK_PARAM, serialiseConfiguration(selection));
  return url.toString();
}
