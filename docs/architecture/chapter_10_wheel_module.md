# Chapter 10 — Wheel Module

## Responsibilities

- Manage wheel brands, models, finishes, and sizes.
- Store transparent wheel assets and metadata.
- Ensure each wheel is publishable and tenant-scoped.

## Attributes

- Brand
- Model name
- Finish
- Size in millimetres
- Asset URI
- Price override (optional)

## Rules

- Each wheel must include a transparent PNG asset.
- Asset dimensions must allow a consistent fit against the vehicle metadata.
- Wheel selection is independent of vehicle-specific rendering logic.
