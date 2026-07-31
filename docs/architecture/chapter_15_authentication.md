# Chapter 15 — Authentication

## Authentication model

- Supabase Auth for dealer and admin authentication.
- Email/password and magic-link support.
- Role-based access control for dealer and admin personas.

## Roles

- Dealer: access to configuration, quote generation, and saved setups.
- Admin: upload assets, review metadata, publish catalog entries.
- Super Admin: tenant management and platform governance.

## Security requirements

- MFA optional for admin accounts.
- Session refresh tokens rotated on renewal.
- All authenticated requests must be validated server-side.
