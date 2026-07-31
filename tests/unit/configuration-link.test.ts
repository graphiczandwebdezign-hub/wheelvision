import { describe, expect, it } from 'vitest';
import {
  buildConfigurationUrl,
  CONFIG_LINK_PARAM,
  CONFIG_LINK_VERSION,
  parseConfigurationLink,
  serialiseConfiguration,
} from '@/features/preview/state/configuration-link';
import type { PreviewSelection } from '@/features/preview/state/preview-store';

const selection: PreviewSelection = {
  vehicleId: 'veh-hilux-sr5',
  colour: 'Graphite Black',
  wheelId: 'wh-te37',
  wheelFinish: 'Matte Black',
  wheelSizeId: 'sz-18x8',
  tyreId: 'ty-ps4',
  tyreProfileId: 'pf-265-65-17',
};

const emptySelection: PreviewSelection = {
  vehicleId: null,
  colour: null,
  wheelId: null,
  wheelFinish: null,
  wheelSizeId: null,
  tyreId: null,
  tyreProfileId: null,
};

describe('configuration link codec', () => {
  it('round-trips a full selection exactly', () => {
    const token = serialiseConfiguration(selection);
    expect(parseConfigurationLink(`?${CONFIG_LINK_PARAM}=${token}`)).toEqual(selection);
  });

  it('round-trips an empty selection and unicode colour names', () => {
    const link = buildConfigurationUrl(emptySelection);
    expect(parseConfigurationLink(new URL(link).search)).toEqual(emptySelection);

    const unicode = { ...selection, colour: 'Platinum Weiß Perle' };
    expect(parseConfigurationLink(new URL(buildConfigurationUrl(unicode)).search)).toEqual(unicode);
  });

  it('produces URL-safe tokens only', () => {
    const token = serialiseConfiguration(selection);
    expect(token).toMatch(/^[A-Za-z0-9\-_]+$/);
  });

  it('builds the share URL with the config parameter', () => {
    const url = buildConfigurationUrl(selection, 'https://dealer.example/preview');
    expect(url.startsWith('https://dealer.example/preview?')).toBe(true);
    expect(new URL(url).searchParams.get(CONFIG_LINK_PARAM)).toBe(
      serialiseConfiguration(selection),
    );
  });

  it('returns null when the parameter is absent', () => {
    expect(parseConfigurationLink('?page=2')).toBeNull();
    expect(parseConfigurationLink('')).toBeNull();
  });

  it('rejects malformed tokens and payloads without throwing', () => {
    expect(parseConfigurationLink(`?${CONFIG_LINK_PARAM}=not-valid-base64!!`)).toBeNull();

    const notJson = Buffer.from('hello there').toString('base64url');
    expect(parseConfigurationLink(`?${CONFIG_LINK_PARAM}=${notJson}`)).toBeNull();

    const wrongShape = Buffer.from(
      JSON.stringify({ v: CONFIG_LINK_VERSION, s: { vehicleId: 42 } }),
    ).toString('base64url');
    expect(parseConfigurationLink(`?${CONFIG_LINK_PARAM}=${wrongShape}`)).toBeNull();
  });

  it('rejects links from incompatible versions (forward-compatibility)', () => {
    const future = Buffer.from(
      JSON.stringify({ v: CONFIG_LINK_VERSION + 1, s: selection }),
    ).toString('base64url');
    expect(parseConfigurationLink(`?${CONFIG_LINK_PARAM}=${future}`)).toBeNull();
  });

  it('rejects selections with extra or missing keys', () => {
    const missing = Buffer.from(
      JSON.stringify({ v: CONFIG_LINK_VERSION, s: { vehicleId: 'veh-1' } }),
    ).toString('base64url');
    expect(parseConfigurationLink(`?${CONFIG_LINK_PARAM}=${missing}`)).toBeNull();

    const extra = Buffer.from(
      JSON.stringify({ v: CONFIG_LINK_VERSION, s: { ...selection, surprise: 'x' } }),
    ).toString('base64url');
    expect(parseConfigurationLink(`?${CONFIG_LINK_PARAM}=${extra}`)).toBeNull();
  });
});
