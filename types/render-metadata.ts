import { z } from 'zod';

/**
 * Chapter-6 vehicle render metadata: the vehicle-independent package a
 * renderer consumes. Authored in `vehicles/{make}/{model}/{year}/metadata.json`,
 * validated here, stored on the variant as `renderMetadata`, and served by
 * the vehicle detail API. Assets are absolute public paths once stored.
 */
export const wheelPositionSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
});

export type WheelPosition = z.infer<typeof wheelPositionSchema>;

export const vehicleRenderMetadataSchema = z.object({
  wheelDiameter: z.number().int().positive(),
  frontWheel: wheelPositionSchema,
  rearWheel: wheelPositionSchema,
  bodyImage: z.string().min(1),
  maskImage: z.string().min(1),
  shadowImage: z.string().min(1),
});

export type VehicleRenderMetadata = z.infer<typeof vehicleRenderMetadataSchema>;
