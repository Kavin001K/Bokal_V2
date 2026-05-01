# Bookal — Venue Booking Management App

Tamil Nadu venue booking management system for 1 Mahal hall + 3 AC Rooms.

## Architecture

| Layer | Stack |
|-------|-------|
| Mobile | Expo (React Native), Expo Router v6, TanStack Query |
| API | Express + Drizzle ORM + PostgreSQL |
| Auth | JWT (bcryptjs), AsyncStorage persistence |
| Types | OpenAPI → Orval codegen (Zod schemas + React Query hooks) |
| Monorepo | pnpm workspaces |

## Workspaces

- `artifacts/api-server` — Express REST API, port 8080, served at `/api`
- `artifacts/mobile` — Expo mobile app (web + native)
- `lib/api-spec` — OpenAPI 3.0 spec (`openapi.yaml`)
- `lib/api-zod` — Generated TypeScript types from OpenAPI
- `lib/api-client-react` — Generated React Query hooks + fetch client
- `lib/db` — Drizzle ORM schema + migrations

## Running Codegen

```bash
pnpm --filter @workspace/api-spec run codegen
```

## Default Admin Credentials

- Email: `admin@bookal.app`
- Password: `Admin@123`

## Features

- **Auth**: Email/password login, JWT, persistent sessions (AsyncStorage), change password
- **Venues**: 1 Mahal (₹2000/hr) + 3 AC Rooms (₹500/hr each)
- **Bookings**: Full CRUD, conflict detection, 4-step creation form
- **Tamil Calendar**: Dual-language date display (Tamil + English)
- **Reports**: Revenue, venue performance, employee stats (admin only)
- **Settings**: Venue pricing, employee management (admin only)
- **WhatsApp**: Share booking confirmation via WhatsApp
- **Design**: Warm terracotta (#C75B2A) brand, light cream background (#FDF8F3)

## Database Schema

Tables: `users`, `venues`, `bookings`, `booking_venues`, `settings`

## API Routes

| Method | Path | Auth |
|--------|------|------|
| POST | /api/auth/login | Public |
| POST | /api/auth/change-password | Auth |
| GET/POST | /api/bookings | Auth |
| GET/PUT/DELETE | /api/bookings/:id | Auth |
| GET | /api/bookings/availability | Auth |
| GET | /api/venues | Auth |
| PUT | /api/venues/:id/price | Admin |
| GET/PUT | /api/settings | Admin |
| GET/POST/PUT | /api/users | Admin |
| GET | /api/reports/summary | Admin |
| GET | /api/reports/export | Admin |
| GET | /api/customers/search | Auth |

## Booking Reference Format

`MBK-YYYY-NNNN` (e.g., MBK-2026-0001)
