# Chapter 17 — Dealer Administration Platform (Sprint 10)

## Overview

The Dealer Administration Platform provides tenant-isolated operational control over every WheelVision instance. Dealers can manage their catalog, pricing, promotions, consultants, and tenant settings without developer intervention.

## Modules Implemented

- `/admin/dashboard`: Real-time quotation metrics, conversion rate, estimated revenue, top-selling wheel/tyre brands, recent activity, and system health.
- `/admin/catalog`: Vehicle, wheel, and tyre inventory management with status toggles, filtering, pagination, and soft deletion.
- `/admin/pricing`: Price lists, wheel/tyre model unit pricing, and labour service fees (balancing, alignment, fitment).
- `/admin/promotions`: Discount campaigns (percentage and fixed amounts), priorities, stacking rules, and validity windows.
- `/admin/consultants`: Dealer consultant team profiles, contact info, active status, and default assignment.
- `/admin/settings`: Dealership profile, VAT registration, company registration, regional settings, quote validity period, and logo upload storage abstraction.

## Architecture & Reusable Primitives

- `features/admin/`: Admin types, API hooks, and layout shells.
- `AdminTable`: Reusable data table supporting search, sorting, pagination, and CSV export.
- `AdminLayoutShell`: Consistent sidebar navigation and tenant status header.
- Permissions: Extension interfaces designed for Sprint 12 RBAC integration.
