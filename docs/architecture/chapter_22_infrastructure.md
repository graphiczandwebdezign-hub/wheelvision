# Chapter 22 — Infrastructure

## Deployment target

- Vercel for Next.js application hosting.
- Supabase for PostgreSQL and auth services.
- Cloudflare R2 for long-term asset storage.

## Environment strategy

- Development, staging, and production environments.
- Separate secrets and storage buckets per environment.
- Infrastructure managed via environment variables and deployment configuration.

## Observability

- Logging, metrics, and error tracking enabled for API and rendering failures.
- Monitoring for slow asset loads and failed publishes.
