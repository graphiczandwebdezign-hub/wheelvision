# Chapter 4 — Domain-Driven Design

## Bounded contexts

- Vehicle Catalog
- Wheel Catalog
- Tyre Catalog
- Rendering
- Quote Management
- Admin Publishing
- Tenant Management

## Core entities

- Tenant
- Dealer
- Vehicle
- VehicleAssetPackage
- WheelModel
- WheelFinish
- TyreSpec
- RenderConfiguration
- Quote
- QuoteLine

## Aggregates

- VehicleAggregate: vehicle + metadata + assets + published state
- WheelAggregate: wheel + brand + finish + size + asset references
- QuoteAggregate: quote + quote lines + tenant context

## Domain rules

- A vehicle must have valid wheel coordinate metadata before publication.
- A wheel asset package must have transparent PNG assets and metadata that match the configured size.
- A tyre configuration must maintain a realistic overall rolling diameter.
