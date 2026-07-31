import { describe, expect, it } from 'vitest';
import {
  filterVehicles,
  matchesVehicleQuery,
  resolveVehicle,
  vehicleColours,
  vehicleDisplayName,
  vehicleManufacturers,
  vehicleModels,
  vehicleYears,
} from '@/features/preview/selection/vehicle-facets';
import {
  filterWheels,
  filterWheelSizes,
  formatWheelSize,
  matchesWheelQuery,
  sizeBoltPatterns,
  sizeDiametersInches,
  sizeOffsetsMm,
  sizeWidthsInches,
  wheelBrands,
  wheelFinishes,
  wheelModels,
} from '@/features/preview/selection/wheel-facets';
import {
  filterTyreProfiles,
  filterTyres,
  formatTyreProfile,
  profileAspectRatios,
  profileRimDiametersInches,
  profileWidthsMm,
  resolveTyreProfile,
  tyreBrands,
  tyrePatterns,
} from '@/features/preview/selection/tyre-facets';
import {
  ps4Detail,
  te37Detail,
  tyreSummaries,
  vehicleSummaries,
  wheelSummaries,
} from '../helpers/catalog-fixtures';

describe('vehicle facets', () => {
  it('derives sorted manufacturer/model/year cascades', () => {
    expect(vehicleManufacturers(vehicleSummaries)).toEqual(['Ford', 'Toyota']);
    expect(vehicleModels(vehicleSummaries, 'Toyota')).toEqual(['Hilux']);
    expect(vehicleYears(vehicleSummaries, 'Toyota', 'Hilux')).toEqual([2025, 2019]);
    expect(vehicleYears(vehicleSummaries, 'Ford', null)).toEqual([2024]);
  });

  it('derives distinct colours across the catalog', () => {
    expect(vehicleColours(vehicleSummaries)).toEqual([
      'Arctic White',
      'Graphite Black',
      'Pearl White',
      'Silver',
    ]);
  });

  it('matches free-text across manufacturer, model, variant and year', () => {
    const sr5 = vehicleSummaries[0];
    expect(matchesVehicleQuery(sr5, 'hilux')).toBe(true);
    expect(matchesVehicleQuery(sr5, 'double cab')).toBe(true);
    expect(matchesVehicleQuery(sr5, '2025')).toBe(true);
    expect(matchesVehicleQuery(sr5, 'ranger')).toBe(false);
    expect(matchesVehicleQuery(sr5, '   ')).toBe(true);
  });

  it('filters by every vehicle dimension', () => {
    expect(filterVehicles(vehicleSummaries, { manufacturer: 'Toyota' })).toHaveLength(3);
    expect(filterVehicles(vehicleSummaries, { model: 'Ranger' })).toHaveLength(1);
    expect(filterVehicles(vehicleSummaries, { year: 2025 })).toHaveLength(2);
    expect(filterVehicles(vehicleSummaries, { colour: 'Silver' })).toHaveLength(2);
    expect(filterVehicles(vehicleSummaries, { colour: 'Arctic White' })).toHaveLength(1);
    expect(
      filterVehicles(vehicleSummaries, { manufacturer: 'Toyota', year: 2025, query: 'legend' }),
    ).toEqual([vehicleSummaries[1]]);
  });

  it('resolves a unique vehicle only when the cascade names exactly one', () => {
    expect(resolveVehicle(vehicleSummaries, 'Ford', 'Ranger', 2024)?.id).toBe('veh-ranger-xlt');
    expect(resolveVehicle(vehicleSummaries, 'Toyota', 'Hilux', 2025)).toBeUndefined(); // ambiguous
    expect(resolveVehicle(vehicleSummaries, 'Toyota', 'Hilux', 2019)?.id).toBe('veh-hilux-srx');
    expect(resolveVehicle(vehicleSummaries, null, null, null)).toBeUndefined();
  });

  it('formats the display name with the year when present', () => {
    expect(vehicleDisplayName(vehicleSummaries[0])).toBe('2025 Toyota Hilux SR5 Double Cab');
    expect(vehicleDisplayName({ ...vehicleSummaries[0], year: null })).toBe(
      'Toyota Hilux SR5 Double Cab',
    );
  });
});

describe('wheel facets', () => {
  it('derives brand/model/finish cascades', () => {
    expect(wheelBrands(wheelSummaries)).toEqual(['BBS', 'Rays']);
    expect(wheelModels(wheelSummaries, 'Rays')).toEqual(['RX-2', 'TE37']);
    expect(wheelFinishes(wheelSummaries)).toEqual(['Bronze', 'Matte Black', 'Satin Silver']);
  });

  it('matches and filters wheels by brand, finish and query', () => {
    expect(matchesWheelQuery(wheelSummaries[0], 'te37')).toBe(true);
    expect(matchesWheelQuery(wheelSummaries[0], 'bronze')).toBe(true);
    expect(filterWheels(wheelSummaries, { brand: 'Rays' })).toHaveLength(2);
    expect(filterWheels(wheelSummaries, { finish: 'Matte Black' })).toHaveLength(2);
    expect(filterWheels(wheelSummaries, { finish: 'Satin Silver' })).toHaveLength(1);
    expect(filterWheels(wheelSummaries, { brand: 'Rays', query: 'rx' })[0].model).toBe('RX-2');
  });

  it('derives size-spec cascades', () => {
    const sizes = te37Detail.sizes;
    expect(sizeDiametersInches(sizes)).toEqual([17, 18]);
    expect(sizeWidthsInches(sizes)).toEqual([8, 8.5, 9]);
    expect(sizeOffsetsMm(sizes)).toEqual([20, 30, 35]);
    expect(sizeBoltPatterns(sizes)).toEqual(['6/114.3', '6/139.7']);
  });

  it('filters sizes by every fitment dimension', () => {
    const sizes = te37Detail.sizes;
    expect(filterWheelSizes(sizes, { diameterInches: 18 })).toHaveLength(2);
    expect(filterWheelSizes(sizes, { widthInches: 8.5 })).toHaveLength(1);
    expect(filterWheelSizes(sizes, { offsetMm: 35 })).toHaveLength(1);
    expect(filterWheelSizes(sizes, { boltPattern: '6/139.7' })).toHaveLength(2);
    expect(filterWheelSizes(sizes, { diameterInches: 18, offsetMm: 20 })[0].id).toBe('sz-18x9');
  });

  it('formats size labels from available facts only', () => {
    expect(formatWheelSize(te37Detail.sizes[0])).toBe('18×8.0J — 18×8 · 6/139.7 · ET35');
    expect(formatWheelSize({ ...te37Detail.sizes[0], boltPattern: null, offsetMm: null })).toBe(
      '18×8.0J — 18×8',
    );
    expect(
      formatWheelSize({
        ...te37Detail.sizes[0],
        diameterInches: null,
        widthInches: null,
        boltPattern: null,
        offsetMm: null,
      }),
    ).toBe('18×8.0J');
  });
});

describe('tyre facets', () => {
  it('derives brand/pattern cascades and applies filters', () => {
    expect(tyreBrands(tyreSummaries)).toEqual(['Bridgestone', 'Michelin']);
    expect(tyrePatterns(tyreSummaries, 'Michelin')).toEqual(['Pilot Sport 4']);
    expect(filterTyres(tyreSummaries, { brand: 'Michelin' })).toHaveLength(1);
    expect(filterTyres(tyreSummaries, { query: 'dueler' })).toHaveLength(1);
  });

  it('derives the Width → Profile → Diameter cascades consistently', () => {
    const profiles = ps4Detail.profiles;
    expect(profileWidthsMm(profiles)).toEqual([245, 265]);
    expect(profileAspectRatios(profiles, 265)).toEqual([60, 65]);
    expect(profileAspectRatios(profiles, null)).toEqual([60, 65, 70]);
    expect(profileRimDiametersInches(profiles, { widthMm: 265, aspectRatio: 65 })).toEqual([17]);
    expect(profileRimDiametersInches(profiles, { widthMm: 265 })).toEqual([17, 18]);
  });

  it('resolves a profile only from complete dimensions', () => {
    const profiles = ps4Detail.profiles;
    expect(
      resolveTyreProfile(profiles, { widthMm: 265, aspectRatio: 65, rimDiameterInches: 17 })?.id,
    ).toBe('pf-265-65-17');
    expect(resolveTyreProfile(profiles, { widthMm: 265, aspectRatio: 65 })).toBeUndefined();
    expect(
      resolveTyreProfile(profiles, { widthMm: 999, aspectRatio: 65, rimDiameterInches: 17 }),
    ).toBeUndefined();
    expect(filterTyreProfiles(profiles, { widthMm: 265 })).toHaveLength(2);
  });

  it('formats compact profile labels', () => {
    expect(formatTyreProfile(ps4Detail.profiles[0])).toBe('265/65 R17');
    expect(formatTyreProfile({ ...ps4Detail.profiles[0], widthMm: null, aspectRatio: null })).toBe(
      'R17',
    );
  });
});
