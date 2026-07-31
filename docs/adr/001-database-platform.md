# ADR-001: Database Platform — PostgreSQL via Prisma

- **Status:** Accepted
- **Date:** 2026-07-31
- **Deciders:** Lead Software Architect
- **Supersedes:** none
- **Related:** `docs/architecture/chapter_05_database_architecture.md`, `docs/architecture/chapter_16_multi_tenant.md`

## Context

The architecture specification (Chapter 5) describes a Supabase-hosted
PostgreSQL platform with snake_case tables, while the implemented codebase
has standardized on Prisma ORM with a hand-versioned migration history
(`prisma/migrations/`) and camelCase/PascalCase naming. Before building
further data-facing features, the project needs one documented, deliberate
database platform decision so that schema evolution, tenancy work, and
future infrastructure work all target the same contract.

## Options considered

1. **Plain PostgreSQL + Prisma (current implementation).** Prisma schema is
   the source of truth; migrations are versioned SQL in the repo; hosting is
   any PostgreSQL 15+ provider (self-managed, RDS, Cloud SQL, or Supabase's
   managed Postgres).
2. **Adopt the Supabase platform now (Auth + Storage + PostgREST + RLS
   helpers).** Matches the spec's long-term direction, but introduces
   platform coupling (Auth, Storage, Edge Functions) before any feature
   needs it, duplicates responsibilities Prisma already covers, and would
   rewrite a working, tested migration setup without functional gain.
3. **SQLite or another embedded database.** Not credible for a multi-tenant
   SaaS: no row-level security, limited concurrency, no production story.

## Decision

**Standardize on PostgreSQL accessed exclusively through Prisma**, with the
Prisma schema and `prisma/migrations/` as the single source of truth for
database structure. The platform is deliberately hosting-agnostic: because
Supabase _is_ managed PostgreSQL, adopting Supabase hosting (or its auth and
storage services) later is an infrastructure decision — not an application
rewrite — and will be evaluated in the authentication sprint (ADR-002) when
there is a concrete consumer.

Row-level security, which the multi-tenant architecture depends on, remains
available in plain PostgreSQL and will be added as a migration alongside the
authentication implementation, tested against the same Prisma client.

## Consequences

### Positive

- One schema authority (Prisma) — eliminates the spec/implementation drift
  identified in the 2026-07-31 audit.
- Migration history stays reviewable SQL in Git; deployments use
  `prisma migrate deploy` against any PostgreSQL endpoint.
- Tenant-scoped unique constraints (this sprint) and future RLS policies
  work identically on every PostgreSQL host, including Supabase if chosen.
- No vendor lock-in before the platform needs managed auth/storage.

### Negative / accepted trade-offs

- We do not get Supabase Auth/Storage "for free" yet; authentication and
  asset storage will be evaluated as an explicit decision (ADR-002) rather
  than inherited by accident.
- Chapter 5's illustrative snake_case DDL is superseded by the Prisma schema
  (relationships and intent are preserved; naming follows Prisma
  conventions). Architecture docs are updated as they are implemented, per
  Chapter 25 standards.

## Compliance

This ADR is enforced by convention: all data access goes through the
repository layer over the Prisma client (`server/utils/prisma.ts`); no
database client may be introduced without a superseding ADR.
