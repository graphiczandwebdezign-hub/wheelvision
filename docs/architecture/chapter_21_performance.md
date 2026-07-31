# Chapter 21 — Performance Engineering

## Performance goals

- Fast initial load for the preview experience.
- Asset lazy loading with progressive enhancement.
- Responsive UI even with large catalog sets.

## Caching strategy

- TanStack Query for catalog and configuration caching.
- CDN caching for public asset delivery.
- Optimized image formats and lazy loading for preview assets.

## Scale considerations

- Use server rendering where beneficial for initial view and SEO.
- Use edge caching for public metadata and asset requests.
- Load only required asset layers when rendering a selected vehicle.
