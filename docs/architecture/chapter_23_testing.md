# Chapter 23 — Testing

## Test pyramid

- Unit tests for metadata validators, rendering math, and domain rules.
- Integration tests for API routes and data access.
- End-to-end tests for preview rendering and quote workflows.

## Tools

- Vitest or Jest for unit tests.
- Playwright for end-to-end UI validation.
- Testing Library for React component behaviour.

## Coverage goals

- Rendering math and validation logic: high coverage.
- Critical tenant policies: exhaustive tests.
- Admin publishing workflow: regression coverage.
