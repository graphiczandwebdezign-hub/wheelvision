# Chapter 8 — Asset Pipeline

## Asset categories

- Vehicle body assets: vehicle.webp, mask.webp, shadow.webp
- Wheel assets: transparent PNGs for each finish and size
- Tyre assets: optional vector or raster overlays if required

## Storage strategy

- Primary storage: Cloudflare R2 for production.
- Local development: public assets in the repository or a local bucket emulator.
- Asset versioning: stored with semantic version and publish state.

## Publishing workflow

1. Upload raw asset package.
2. Validate dimensions, transparency, and naming conventions.
3. Run background removal or image normalization if needed.
4. Review and publish.
5. Expose the published asset package to the renderer.

## Naming convention

- Vehicles: `vehicles/{manufacturer}/{model}/{year}/{assetName}`
- Wheels: `wheels/{brand}/{model}/{finish}/{size}/{assetName}`
