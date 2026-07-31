# Chapter 13 — State Management

## State layers

- Server state: vehicles, wheels, tyres, quotes via TanStack Query.
- Client UI state: selected vehicle, wheel, tyre, and preview configuration via React state.
- Form state: React Hook Form + Zod validation for admin and quote forms.

## State ownership

- `PreviewStore`: selected configuration and render context.
- `CatalogQuery`: fetches and caches catalog entities.
- `QuoteDraft`: unsaved configuration before quote creation.

## Principles

- Server state remains cache-managed and query-driven.
- Client mutations use optimistic updates where appropriate.
- Global state is minimized to preserve predictable rendering behaviour.
