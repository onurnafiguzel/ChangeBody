# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server on http://localhost:3000
npm run build        # Type-check + production build
npm run type-check   # TypeScript type check only
npm run lint         # ESLint
npm run preview      # Preview production build
```

## Architecture

React 18 + TypeScript frontend consuming the **ChangeMind API** (ASP.NET Core, Clean Architecture).

**Tech stack:** Vite, React, TypeScript, Axios

**Folder conventions under `src/`:**
- `services/` — Axios-based API call functions (one file per domain: `users.ts`, `coaches.ts`, `payments.ts`, etc.)
- `components/` — Reusable React components
- `hooks/` — Custom hooks (e.g., `useAuth`, `useCurrentUser`)
- `types/` — TypeScript interfaces matching API DTOs
- `utils/` — Pure helpers (token parsing, role guards, etc.)
- `styles/` — CSS files

## Backend API

**Dev base URL:** `http://localhost:5000`
**Production:** `https://api.changemind.com`

Configured via `VITE_API_BASE_URL` env var (see `.env.example`). The Axios instance in `src/services/api.ts` applies the base URL and injects the Bearer token from `localStorage`.

### Authentication

`POST /api/auth/login` — returns `{ userId, email, role, accessToken, refreshToken, expiresIn: 900 }`

- Store `accessToken` + `refreshToken` in `localStorage`.
- All protected requests require `Authorization: Bearer <accessToken>`.
- Access token TTL: **15 min**. Refresh token TTL: **7 days**.
- On `401`, retry with `POST /api/auth/refresh` using `{ refreshToken }` to get a new `accessToken`. If refresh fails, clear storage and redirect to `/login`.
- Roles: `"User" | "Coach" | "Admin"` (hierarchy: User < Coach < Admin). Stored in `localStorage` as `role`.

### Endpoints summary

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/auth/login` | — | Login |
| GET/POST | `/api/users` | — | List/Register |
| GET | `/api/users/waiting` | Coach+ | Unassigned users |
| GET/PUT/DELETE | `/api/users/{id}` | — / User+ | Profile |
| POST | `/api/users/{id}/complete-profile` | User+ | Fitness info after register |
| POST | `/api/users/{id}/change-password` | User+ | — |
| GET/POST | `/api/coaches` | — / Admin | List/Create |
| GET/PUT/DELETE | `/api/coaches/{id}` | — / Admin | — |
| POST | `/api/coaches/{id}/change-password` | Admin | — |
| GET/POST | `/api/packages` | — / Admin | List/Create |
| GET/PUT/DELETE | `/api/packages/{id}` | — / Admin | — |
| GET/POST | `/api/exercises` | — / Admin | List/Create (filters: muscleGroup, difficultyLevel, search, sortBy) |
| GET/PUT/DELETE | `/api/exercises/{id}` | — / Admin | — |
| POST | `/api/training-programs` | Coach+ | Create & assign to user |
| GET | `/api/training-programs/{id}` | — | — |
| GET | `/api/users/{userId}/active-program` | — | User's active program |
| PUT | `/api/training-programs/{id}/daily-program` | Coach+ | Weekly schedule (`{ "Day-1": [{exerciseId, sets, reps, explanation}] }`) |
| POST | `/api/training-programs/{id}/activate` | Coach+ | — |
| POST | `/api/training-programs/{id}/deactivate` | Coach+ | — |
| POST | `/api/training-programs/{id}/complete` | Coach+ | — |
| PUT | `/api/training-programs/{id}/progress` | Coach+ | `{ completedWeeks: number }` |
| POST | `/api/payments` | User+ | Requires `Idempotency-Key: <uuid>` header |
| GET | `/api/payments/{id}` | User+ | — |

### Pagination

List endpoints accept `?page=1&pageSize=10&isActiveOnly=true`. Response shape:
```ts
{ data: T[], total: number, page: number, pageSize: number, totalPages: number }
```

### Payments — idempotency

`POST /api/payments` requires a unique `Idempotency-Key` UUID header per payment attempt. On `409 Conflict`, wait `Retry-After` seconds before retrying with the **same key**.

### Error format (RFC 7807)

```ts
{ type: string, title: string, status: number, detail: string, instance?: string }
// Validation errors add: errors: Record<string, string[]>
```

## Key domain concepts

- **User flow:** Register → complete-profile → purchase package → coach assigns training program → user follows daily exercises.
- **Coach flow:** View waiting users → create training program → manage daily schedules → track progress.
- All deletes are **soft deletes** (`isActive = false`).
- A user can have at most one **active** training program at a time.
- Full OpenAPI spec: [`src/RoadMap/openapi.json`](src/RoadMap/openapi.json)
- Auth guide with TypeScript examples: [`src/RoadMap/AUTH_GUIDE.md`](src/RoadMap/AUTH_GUIDE.md)
