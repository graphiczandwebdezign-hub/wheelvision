# WheelVision Architecture

## Overview

WheelVision is a metadata-driven preview platform for wheel and tyre configuration aimed at dealers and tyre shops. The architecture prioritises scalability, tenant isolation, and a renderer that does not depend on hardcoded vehicle logic.

## Principles

- Metadata-first rendering with a generic scene composition engine.
- Shared database architecture with database-level tenant isolation via RLS.
- Strong TypeScript boundaries and runtime validation.
- Modular feature-first folder structure for long-term maintainability.

## Structure

- app/: Next.js App Router entry points.
- components/: shared UI primitives and providers.
- features/: feature-specific implementations.
- services/: business logic and data access.
- lib/: shared utilities.
- config/: runtime configuration and environment validation.
- types/: domain types.
- docs/: product and engineering documentation.
- tests/: unit and end-to-end coverage.
