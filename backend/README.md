# MediSync Backend

Express + Supabase backend for the Real-Time Healthcare Resource Coordination Platform.

## Quick start

1. Copy `.env.example` to `.env` and fill in Supabase credentials.
2. Install dependencies:
   - `npm install`
3. Start development server:
   - `npm run dev`

## Core APIs (v1)

- `GET /api/v1/health`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/otp/send`
- `POST /api/v1/auth/otp/verify`
- `POST /api/v1/emergency/requests`
- `GET /api/v1/emergency/requests/:id`
- `POST /api/v1/emergency/requests/:id/cancel`
- `GET /api/v1/hospital/command-center`
- `GET /api/v1/hospital/requests`
- `GET /api/v1/hospital/requests/:id`
- `POST /api/v1/hospital/requests/manual`
- `POST /api/v1/hospital/requests/:id/retry`
- `POST /api/v1/hospital/requests/:id/respond`
- `GET /api/v1/events` (SSE)

## Validation

- Backend smoke test: `npm run smoke`
- Backend regression checks: `npm run regression`

## Notes

- OTP is mock for phase 1.
- Hospital decision window is 60 seconds.
- Allocation radius ladder: 5 km -> 10 km -> 20 km -> 35 km.
