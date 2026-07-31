import type {
  TyreDetail,
  TyreSummary,
  VehicleDetail,
  VehicleSummary,
  WheelDetail,
  WheelSummary,
} from '@/types/catalog';

/**
 * Shared catalog fixtures for preview-facing tests. They mirror the seeded
 * demo catalog's shapes (never the real ids) and keep every selector test on
 * the same data so expectations stay consistent.
 */

const createdAt = '2026-01-01T00:00:00.000Z';
const updatedAt = '2026-01-02T00:00:00.000Z';

export const vehicleSummaries: VehicleSummary[] = [
  {
    id: 'veh-hilux-sr5',
    manufacturer: 'Toyota',
    model: 'Hilux',
    variant: 'SR5 Double Cab',
    year: 2025,
    wheelDiameterMm: 455,
    colours: ['Silver', 'Graphite Black'],
    createdAt,
    updatedAt,
  },
  {
    id: 'veh-hilux-legend',
    manufacturer: 'Toyota',
    model: 'Hilux',
    variant: 'Legend',
    year: 2025,
    wheelDiameterMm: 455,
    colours: ['Graphite Black', 'Pearl White'],
    createdAt,
    updatedAt,
  },
  {
    id: 'veh-hilux-srx',
    manufacturer: 'Toyota',
    model: 'Hilux',
    variant: 'SRX',
    year: 2019,
    wheelDiameterMm: 440,
    colours: ['Silver'],
    createdAt,
    updatedAt,
  },
  {
    id: 'veh-ranger-xlt',
    manufacturer: 'Ford',
    model: 'Ranger',
    variant: 'XLT',
    year: 2024,
    wheelDiameterMm: 450,
    colours: ['Arctic White'],
    createdAt,
    updatedAt,
  },
];

export const hiluxDetail: VehicleDetail = {
  ...vehicleSummaries[0],
  renderMetadata: {
    wheelDiameter: 455,
    frontWheel: { x: 840, y: 1375 },
    rearWheel: { x: 3090, y: 1375 },
    bodyImage: '/vehicles/toyota/hilux/2025/vehicle.webp',
    maskImage: '/vehicles/toyota/hilux/2025/mask.webp',
    shadowImage: '/vehicles/toyota/hilux/2025/shadow.webp',
  },
};

export const wheelSummaries: WheelSummary[] = [
  {
    id: 'wh-te37',
    brand: 'Rays',
    model: 'TE37',
    finishes: ['Matte Black', 'Bronze'],
    createdAt,
    updatedAt,
  },
  { id: 'wh-rx2', brand: 'Rays', model: 'RX-2', finishes: ['Matte Black'], createdAt, updatedAt },
  {
    id: 'wh-bbs-chr',
    brand: 'BBS',
    model: 'CH-R',
    finishes: ['Satin Silver'],
    createdAt,
    updatedAt,
  },
];

export const te37Detail: WheelDetail = {
  ...wheelSummaries[0],
  sizes: [
    {
      id: 'sz-18x8',
      size: '18×8.0J',
      diameterInches: 18,
      widthInches: 8,
      boltPattern: '6/139.7',
      offsetMm: 35,
      centreBoreMm: 106.1,
    },
    {
      id: 'sz-18x9',
      size: '18×9.0J',
      diameterInches: 18,
      widthInches: 9,
      boltPattern: '6/139.7',
      offsetMm: 20,
      centreBoreMm: 106.1,
    },
    {
      id: 'sz-17x85',
      size: '17×8.5J',
      diameterInches: 17,
      widthInches: 8.5,
      boltPattern: '6/114.3',
      offsetMm: 30,
      centreBoreMm: 67.1,
    },
  ],
  boltPatterns: ['6/139.7', '6/114.3'],
  offsetsMm: [35, 20, 30],
  centreBoresMm: [106.1, 67.1],
  metadata: null,
  pricing: null,
};

export const tyreSummaries: TyreSummary[] = [
  {
    id: 'ty-ps4',
    brand: 'Michelin',
    pattern: 'Pilot Sport 4',
    profiles: ['265/65 R17', '265/60 R18', '245/70 R16'],
    createdAt,
    updatedAt,
  },
  {
    id: 'ty-dueler',
    brand: 'Bridgestone',
    pattern: 'Dueler H/T',
    profiles: ['265/65 R17'],
    createdAt,
    updatedAt,
  },
];

export const ps4Detail: TyreDetail = {
  id: 'ty-ps4',
  brand: 'Michelin',
  pattern: 'Pilot Sport 4',
  profiles: [
    {
      id: 'pf-265-65-17',
      profile: '265/65 R17',
      widthMm: 265,
      aspectRatio: 65,
      rimDiameterInches: 17,
      construction: 'R',
      loadIndex: 112,
      speedRating: 'H',
    },
    {
      id: 'pf-265-60-18',
      profile: '265/60 R18',
      widthMm: 265,
      aspectRatio: 60,
      rimDiameterInches: 18,
      construction: 'R',
      loadIndex: 110,
      speedRating: 'V',
    },
    {
      id: 'pf-245-70-16',
      profile: '245/70 R16',
      widthMm: 245,
      aspectRatio: 70,
      rimDiameterInches: 16,
      construction: 'R',
      loadIndex: 111,
      speedRating: 'T',
    },
  ],
  createdAt,
  updatedAt,
  metadata: null,
};

/**
 * The shape list API helpers resolve to after the client unwraps the wire
 * envelope (`PaginatedData<T>`).
 */
export function listEnvelope<T>(data: T[], total = data.length) {
  return { data, meta: { page: 1, pageSize: 100, total, totalPages: 1 } };
}
