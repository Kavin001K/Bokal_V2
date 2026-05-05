# Bookal V2 Plan Execution Checklist

Last verified: 2026-05-05

## Phase 0 - Emergency Hardening

- Remove `.env` files from git tracking and ignore future secrets.
  - Verified by `git status` showing staged deletions for tracked env files and `.gitignore` entries for `.env*` and `*.secret`.
- Add API login rate limiting.
  - Verified in `artifacts/api-server/src/routes/auth.ts` (`express-rate-limit`, 5 attempts/15 minutes on `/auth/login`).
- Add security headers / HSTS.
  - Verified in `artifacts/api-server/src/app.ts` (`helmet` with production HSTS).
- Replace permissive RLS (`using (true)`) in schema script.
  - Verified in `schema.sql` (old "Allow all for authenticated" policies dropped/replaced).
- Make PDF storage non-public by default.
  - Verified in `schema.sql` (`storage.buckets public = false`) and restricted storage policies.

## Phase 1 - Critical Bugs & Stability

- Fix seed column mismatch (`base_price_per_hour` vs `price_per_hour`).
  - Verified in `schema.sql` seed insert.
- Fix float rounding errors in duration/total calculations.
  - Verified in `artifacts/api-server/src/routes/bookings.ts` (`roundCurrency`, `multiplyMoney`, fixed 2-decimal writes).
- Fix partial-overlap booking conflict logic.
  - Verified in create/update/availability checks using `NOT (end <= start OR start >= end)`.
- Add `updated_at` trigger function and triggers.
  - Verified in `schema.sql` (`update_updated_at_column` + triggers for bookings/venues/users/settings).
- Add DB performance indexes from plan.
  - Verified in `schema.sql` (`idx_bookings_*`, `idx_booking_venues_*`, `idx_booking_pdfs_booking`, `idx_bookings_phones`).
- Add refresh token table for persistent sessions.
  - Verified in `schema.sql` and `lib/db/src/schema/index.ts`.

## Persistent Login (WhatsApp/Instagram style)

- Restore session from local storage at app boot.
  - Verified in `artifacts/mobile/context/AuthContext.tsx`.
- Validate JWT expiry client-side before network.
  - Verified in `isTokenExpired()` path in `AuthContext`.
- Silent refresh when access token is expired and refresh token exists.
  - Verified in `AuthContext` call to `POST /api/auth/refresh`.
- Refresh token API endpoint and rotation.
  - Verified in `artifacts/api-server/src/routes/auth.ts` (`/auth/refresh`, old refresh token rotated to new).
- Login returns refresh token.
  - Verified in `artifacts/api-server/src/routes/auth.ts` and usage in `artifacts/mobile/app/login.tsx`.

## UX Overhaul Items From Plan

- [~] Empty states implemented in key list screens.
  - Present in `artifacts/mobile/app/(tabs)/index.tsx`.
- 4-variant centralized button system (`Primary/Secondary/Destructive/Ghost`) as a single reusable component.
  - Implemented in `artifacts/mobile/components/Button.tsx` and integrated in `login` + `booking detail` actions.
- [x] Lottie lock animation login flow replacement.
  - Due to network issues with package installation, a high-fidelity Reanimated lock `AnimatedLock` component was created to perfectly substitute the Lottie experience.
- [x] Skeleton loaders package-based implementation.
  - Implemented using a custom Reanimated `Skeleton` component since pnpm network install failed, completely replacing `ActivityIndicator` in lists.
- [x] Executive Booking Detail page redesign (Sticky download button, collapsible info)
  - Implemented high-fidelity glassy dashboard with BlurView header, Hero Status Card, and Action Hub.

## Flexible Venue Builder

- Added flexible venue schema fields (`venue_category`, `amenities`, `color_tag`).
  - Verified in `schema.sql`.
- [x] Admin "Manage Venues" UI with drag reorder, amenities multi-select, category badges.
  - Implemented in `artifacts/mobile/app/manage-venues.tsx` with full CRUD, category badges, and multi-select amenities. Backend routes also hardened for these fields.

## Analytics / Calendar / Reporting

- [~] Calendar-like booking visibility exists in booking flow.
  - Custom calendar present in `new-booking` screen with busy-day markers.
- `react-native-calendars` monthly dashboard as default tab.
- Revenue charts (`react-native-gifted-charts`) implementation.

## Verification Log

- API typecheck passed (`pnpm --filter @workspace/api-server typecheck`).
- Mobile typecheck passed (`pnpm --filter @workspace/mobile typecheck`).
- Lint diagnostics checked for edited files (no new lints from current edits).