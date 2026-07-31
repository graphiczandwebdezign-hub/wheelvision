# Chapter 9 — Vehicle Module

## Responsibilities

- Manage vehicle catalog records.
- Store vehicle metadata and asset references.
- Publish and version vehicle asset packages.
- Expose a generic vehicle API for renderer consumption.

## Folder structure

```text
vehicles/
  toyota/
    hilux/
      2025/
        vehicle.webp
        mask.webp
        shadow.webp
        metadata.json
```

## API expectations

- `GET /api/vehicles` returns publishable vehicle records.
- `GET /api/vehicles/:id` returns the full metadata package.
- `POST /api/admin/vehicles` creates a draft vehicle package.
