export interface WheelPosition {
  x: number;
  y: number;
}

export interface VehicleMetadata {
  id: string;
  manufacturer: string;
  model: string;
  year: number;
  frontWheel: WheelPosition;
  rearWheel: WheelPosition;
  wheelDiameter: number;
  bodyImage: string;
  maskImage: string;
  shadowImage: string;
}

export interface VehicleOption {
  id: string;
  name: string;
  metadata: VehicleMetadata;
}
