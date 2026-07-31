import type { VehicleOption } from '@/types/vehicle';

export const vehicleOptions: VehicleOption[] = [
  {
    id: 'toyota-hilux-2025',
    name: '2025 Toyota Hilux Double Cab',
    metadata: {
      id: 'toyota-hilux-2025',
      manufacturer: 'Toyota',
      model: 'Hilux',
      year: 2025,
      frontWheel: { x: 840, y: 1375 },
      rearWheel: { x: 3090, y: 1375 },
      wheelDiameter: 455,
      bodyImage: '/vehicles/toyota/hilux/2025/vehicle.webp',
      maskImage: '/vehicles/toyota/hilux/2025/mask.webp',
      shadowImage: '/vehicles/toyota/hilux/2025/shadow.webp',
    },
  },
];

export function getVehicleById(id: string) {
  return vehicleOptions.find((vehicle) => vehicle.id === id) ?? vehicleOptions[0];
}
