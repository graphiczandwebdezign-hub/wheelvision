# Chapter 20 — Security

## Security controls

- Authentication and authorization enforced on every request.
- Tenant boundary enforcement through RLS and service checks.
- Image and asset uploads scanned and validated.
- Secrets stored in environment variables and secret managers.

## Threat model

- Cross-tenant data leakage.
- Broken object-level authorization.
- Asset tampering and malicious uploads.
- CSRF, XSS, and injection attacks.

## Defensive design

- Input validation with Zod schemas.
- Signed URLs for private asset access.
- Strict CORS and content security policies.
- Logging and audit trails for admin publishing actions.
