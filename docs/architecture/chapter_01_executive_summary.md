# Chapter 1 — Executive Summary

WheelVision is a multi-tenant SaaS platform for tyre shops and wheel dealers. The product centres on a metadata-driven rendering engine that can visualize a vehicle with configurable tyre and wheel selections without introducing vehicle-specific renderer logic.

## Product goals

- Deliver an MVP for the 2025 Toyota Hilux Double Cab.
- Support a 2D side-profile rendering experience for wheel and tyre configuration.
- Create a platform that can later onboard thousands of vehicles and dealers.

## Strategic approach

The architecture uses Next.js 15, React 19, TypeScript, Tailwind, React Konva, Supabase/PostgreSQL, and TanStack Query. The visual layer is separated from business logic so assets, metadata, and configuration can be expanded independently.

## Success criteria

- Renderer is data-driven and vehicle-independent.
- New vehicles require only assets and metadata.
- All tenant data is isolated and secure.
- The system can support rapid iteration for dealer onboarding and quote workflows.
