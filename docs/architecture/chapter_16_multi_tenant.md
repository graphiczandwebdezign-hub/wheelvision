# Chapter 16 — Multi-Tenant Architecture

## Tenant isolation model

- Each tenant has its own logical namespace in the database.
- Every entity includes a `tenant_id` key.
- Row Level Security policies enforce tenant boundary checks.

## Tenant-level features

- Dealer branding and custom theming.
- Dealer inventory and pricing overrides.
- Tenant-specific vehicles, wheel catalog, and tyre catalog.

## Isolation strategy

- Database-level enforcement with RLS.
- Application-layer checks in every service.
- Separate storage prefixes per tenant for asset isolation.
