# Chapter 5 — Database Architecture

## Platform

- PostgreSQL in Supabase
- Row Level Security for tenant isolation
- UUID primary keys for distributed-safe identity
- Versioned tables for assets and publish workflow

## Core tables

```sql
create table tenants (
  id uuid primary key,
  slug text unique not null,
  name text not null,
  branding jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table dealers (
  id uuid primary key,
  tenant_id uuid references tenants(id) on delete cascade,
  email text not null,
  display_name text not null,
  status text not null default 'active'
);

create table vehicles (
  id uuid primary key,
  tenant_id uuid references tenants(id) on delete cascade,
  manufacturer text not null,
  model text not null,
  year int not null,
  slug text not null,
  metadata jsonb not null,
  published boolean default false,
  created_at timestamptz default now()
);

create table wheel_models (
  id uuid primary key,
  tenant_id uuid references tenants(id) on delete cascade,
  brand text not null,
  model_name text not null,
  finish text not null,
  size_mm int not null,
  asset_uri text not null,
  published boolean default false
);

create table tyre_specs (
  id uuid primary key,
  tenant_id uuid references tenants(id) on delete cascade,
  width_mm int not null,
  profile int not null,
  diameter_in int not null,
  rolling_diameter_mm numeric not null,
  published boolean default false
);

create table quotes (
  id uuid primary key,
  tenant_id uuid references tenants(id) on delete cascade,
  dealer_id uuid references dealers(id),
  vehicle_id uuid references vehicles(id),
  wheel_id uuid references wheel_models(id),
  tyre_id uuid references tyre_specs(id),
  configuration jsonb not null,
  created_at timestamptz default now()
);
```

## ERD summary

- Tenant owns dealers, vehicles, wheels, tyres, and quotes.
- Every entity is scoped to a tenant.
- Publish state is tracked separately from draft records.
