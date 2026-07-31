# Chapter 2 — Product Requirements Specification

## MVP scope

- Single vehicle: 2025 Toyota Hilux Double Cab.
- 2D side-profile rendering.
- Vehicle metadata with wheel coordinates.
- Wheel and tyre visual layers.
- Dealer-facing configuration workflow.

## Functional requirements

- Vehicle selection.
- Wheel selection by brand, model, finish, and size.
- Tyre selection by width, profile, and diameter.
- Preview reset and reconfiguration.
- Quote creation and export.

## Non-functional requirements

- Support for thousands of dealer accounts.
- Fast loading under normal broadband conditions.
- Clear error handling for missing assets and invalid metadata.
- Auditability for admin publishing and quote generation.

## Constraints

- No hardcoded vehicle rendering rules.
- Assets must be publishable without code changes.
- Tenant data must remain isolated.
