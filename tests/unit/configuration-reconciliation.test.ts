import { describe, expect, it } from 'vitest';
import {
  reconcileSelection,
  selectionSignature,
  MISSING_NONE,
  type ReconciliationInput,
} from '@/features/preview/selection/configuration-reconciliation';
import type { PreviewSelection } from '@/features/preview/state/preview-store';
import { hiluxDetail, ps4Detail, te37Detail } from '../helpers/catalog-fixtures';

const EMPTY: PreviewSelection = {
  vehicleId: null,
  colour: null,
  wheelId: null,
  wheelFinish: null,
  wheelSizeId: null,
  tyreId: null,
  tyreProfileId: null,
};

/** Fully valid selection against the fixtures. */
const VALID: PreviewSelection = {
  vehicleId: hiluxDetail.id,
  colour: 'Silver',
  wheelId: te37Detail.id,
  wheelFinish: 'Matte Black',
  wheelSizeId: 'sz-18x8',
  tyreId: ps4Detail.id,
  tyreProfileId: 'pf-265-65-17',
};

function input(partial: Partial<ReconciliationInput>): ReconciliationInput {
  return { selection: EMPTY, missing: MISSING_NONE, ...partial };
}

describe('reconcileSelection', () => {
  it('leaves an empty selection untouched', () => {
    const result = reconcileSelection(input({}));
    expect(result.changed).toBe(false);
    expect(result.notices).toEqual([]);
    expect(result.corrected).toEqual(EMPTY);
  });

  it('accepts a fully valid selection without notices', () => {
    const result = reconcileSelection(
      input({ selection: VALID, vehicle: hiluxDetail, wheel: te37Detail, tyre: ps4Detail }),
    );
    expect(result.changed).toBe(false);
    expect(result.notices).toEqual([]);
    expect(result.corrected).toEqual(VALID);
  });

  it('waits while detail data is pending (no missing flag, no DTO)', () => {
    const result = reconcileSelection(input({ selection: VALID }));
    expect(result.changed).toBe(false);
    expect(result.notices).toEqual([]);
  });

  it('removes a vehicle the catalog has delisted, clearing its colour', () => {
    const result = reconcileSelection(
      input({
        selection: VALID,
        missing: { vehicle: true, wheel: false, tyre: false },
      }),
    );
    expect(result.changed).toBe(true);
    expect(result.corrected.vehicleId).toBeNull();
    expect(result.corrected.colour).toBeNull();
    expect(result.corrected.wheelId).toBe(te37Detail.id); // other steps untouched
    expect(result.notices).toHaveLength(1);
    expect(result.notices[0].field).toBe('vehicle');
  });

  it('clears a colour the vehicle no longer lists, keeping the vehicle', () => {
    const result = reconcileSelection(
      input({
        selection: { ...VALID, colour: 'Candy Red' },
        vehicle: hiluxDetail,
      }),
    );
    expect(result.changed).toBe(true);
    expect(result.corrected.vehicleId).toBe(hiluxDetail.id);
    expect(result.corrected.colour).toBeNull();
    expect(result.notices.map((notice) => notice.field)).toEqual(['colour']);
    expect(result.notices[0].message).toContain('Candy Red');
  });

  it('trusts a loaded DTO over the missing flag', () => {
    const result = reconcileSelection(
      input({
        selection: VALID,
        vehicle: hiluxDetail,
        missing: { vehicle: true, wheel: false, tyre: false },
      }),
    );
    expect(result.changed).toBe(false);
    expect(result.notices).toEqual([]);
  });

  it('removes a delisted wheel together with its finish and size (one notice)', () => {
    const result = reconcileSelection(
      input({
        selection: VALID,
        missing: { vehicle: false, wheel: true, tyre: false },
      }),
    );
    expect(result.changed).toBe(true);
    expect(result.corrected.wheelId).toBeNull();
    expect(result.corrected.wheelFinish).toBeNull();
    expect(result.corrected.wheelSizeId).toBeNull();
    expect(result.notices.map((notice) => notice.field)).toEqual(['wheel']);
  });

  it('clears only the finish when the wheel stays but the finish went', () => {
    const result = reconcileSelection(
      input({
        selection: { ...VALID, wheelFinish: 'Unobtainium' },
        wheel: te37Detail,
      }),
    );
    expect(result.changed).toBe(true);
    expect(result.corrected.wheelId).toBe(te37Detail.id);
    expect(result.corrected.wheelFinish).toBeNull();
    expect(result.corrected.wheelSizeId).toBe('sz-18x8');
    expect(result.notices.map((notice) => notice.field)).toEqual(['wheelFinish']);
  });

  it('clears an unknown size even when the finish is still valid', () => {
    const result = reconcileSelection(
      input({
        selection: { ...VALID, wheelSizeId: 'sz-19x10' },
        wheel: te37Detail,
      }),
    );
    expect(result.changed).toBe(true);
    expect(result.corrected.wheelFinish).toBe('Matte Black');
    expect(result.corrected.wheelSizeId).toBeNull();
    expect(result.notices.map((notice) => notice.field)).toEqual(['wheelSize']);
  });

  it('reports finish and size drift independently', () => {
    const result = reconcileSelection(
      input({
        selection: { ...VALID, wheelFinish: 'Unobtainium', wheelSizeId: 'sz-19x10' },
        wheel: te37Detail,
      }),
    );
    expect(result.changed).toBe(true);
    expect(result.corrected.wheelFinish).toBeNull();
    expect(result.corrected.wheelSizeId).toBeNull();
    expect(result.notices.map((notice) => notice.field)).toEqual(['wheelFinish', 'wheelSize']);
  });

  it('removes a delisted tyre together with its profile (one notice)', () => {
    const result = reconcileSelection(
      input({
        selection: VALID,
        missing: { vehicle: false, wheel: false, tyre: true },
      }),
    );
    expect(result.changed).toBe(true);
    expect(result.corrected.tyreId).toBeNull();
    expect(result.corrected.tyreProfileId).toBeNull();
    expect(result.notices.map((notice) => notice.field)).toEqual(['tyre']);
  });

  it('clears a profile the tyre no longer lists', () => {
    const result = reconcileSelection(
      input({
        selection: { ...VALID, tyreProfileId: 'pf-999-99-99' },
        tyre: ps4Detail,
      }),
    );
    expect(result.changed).toBe(true);
    expect(result.corrected.tyreId).toBe(ps4Detail.id);
    expect(result.corrected.tyreProfileId).toBeNull();
    expect(result.notices.map((notice) => notice.field)).toEqual(['tyreProfile']);
  });

  it('combines independent drifts in one pass with stable ordering', () => {
    const result = reconcileSelection(
      input({
        selection: { ...VALID, wheelFinish: 'Unobtainium' },
        wheel: te37Detail,
        missing: { vehicle: true, wheel: false, tyre: true },
      }),
    );
    expect(result.changed).toBe(true);
    expect(result.corrected.vehicleId).toBeNull();
    expect(result.corrected.wheelId).toBe(te37Detail.id);
    expect(result.corrected.wheelFinish).toBeNull();
    expect(result.corrected.tyreId).toBeNull();
    expect(result.notices.map((notice) => notice.field)).toEqual([
      'vehicle',
      'wheelFinish',
      'tyre',
    ]);
  });

  it('performs no dependent-clearing work when nothing was selected', () => {
    const result = reconcileSelection(
      input({
        selection: { ...EMPTY, colour: 'Silver' }, // junk: colour without vehicle
        missing: { vehicle: true, wheel: true, tyre: true },
      }),
    );
    expect(result.changed).toBe(false);
  });
});

describe('selectionSignature', () => {
  it('is stable for identical selections', () => {
    expect(selectionSignature(VALID)).toBe(selectionSignature({ ...VALID }));
  });

  it('changes with any single field', () => {
    const base = selectionSignature(VALID);
    expect(selectionSignature({ ...VALID, vehicleId: null })).not.toBe(base);
    expect(selectionSignature({ ...VALID, colour: null })).not.toBe(base);
    expect(selectionSignature({ ...VALID, wheelSizeId: 'sz-17x85' })).not.toBe(base);
    expect(selectionSignature({ ...VALID, tyreProfileId: null })).not.toBe(base);
  });

  it('distinguishes empty from filled selections', () => {
    expect(selectionSignature(EMPTY)).not.toBe(selectionSignature(VALID));
  });
});
