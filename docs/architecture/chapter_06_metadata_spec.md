# Chapter 6 — Metadata Specification

## Vehicle metadata schema

```json
{
  "id": "toyota-hilux-2025",
  "manufacturer": "Toyota",
  "model": "Hilux",
  "year": 2025,
  "frontWheel": {
    "x": 840,
    "y": 1375
  },
  "rearWheel": {
    "x": 3090,
    "y": 1375
  },
  "wheelDiameter": 455,
  "bodyImage": "vehicle.webp",
  "maskImage": "mask.webp",
  "shadowImage": "shadow.webp"
}
```

## Validation rules

- Required fields: id, manufacturer, model, year, frontWheel, rearWheel, wheelDiameter.
- Coordinates must be integers.
- Wheel diameter must be positive.
- Assets referenced by metadata must exist in the vehicle package.

## Versioning

- Metadata is versioned per asset package.
- Published metadata is immutable until a new version is approved.
