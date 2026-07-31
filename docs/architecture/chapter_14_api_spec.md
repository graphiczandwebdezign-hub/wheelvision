# Chapter 14 — API Specification

## Base URL

- Production: `https://api.wheelvision.app`
- Local: `http://localhost:3000/api`

## Core endpoints

### Vehicles

- `GET /api/vehicles`
- `GET /api/vehicles/:id`
- `POST /api/admin/vehicles`
- `PATCH /api/admin/vehicles/:id`

### Wheels

- `GET /api/wheels`
- `GET /api/wheels/:id`
- `POST /api/admin/wheels`

### Tyres

- `GET /api/tyres`
- `GET /api/tyres/:id`
- `POST /api/admin/tyres`

### Quotes

- `POST /api/quotes`
- `GET /api/quotes/:id`
- `POST /api/quotes/:id/email`

## Request and response conventions

- JSON payloads for all REST endpoints.
- Standard error envelope: `{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }`.
- Prefer explicit status codes: `200`, `201`, `400`, `401`, `403`, `404`, `422`, `500`.
