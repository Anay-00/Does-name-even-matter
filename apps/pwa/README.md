# MediSync SOS PWA

A standalone Progressive Web App for ultra-fast emergency requests.

## Features

- Mobile-only setup (no OTP friction).
- One-time family seeding (self + family members).
- Minimal emergency flow: choose patient + symptom + request help.
- Auto location detection with continuous foreground refresh.
- Live video capture after request and AI first-aid guidance from captured frame.
- Offline queue: requests are stored and auto-retried when network returns.
- Live status polling every 2.5 seconds.
- Installable PWA with service worker and manifest.

## Product flow

1. Enter mobile number and seed family members once.
2. During emergency: select patient, select symptom, tap `Request Help`.
3. Optionally capture live video and receive immediate AI guidance.

## Run locally

1. Install dependencies:

   npm install

2. Start dev server:

   npm run dev

3. Build production bundle:

   npm run build

## Environment

Create `.env` in this directory from `.env.example`.

Required values:

- `VITE_API_BASE_URL` (example: `http://localhost:8080/api/v1`)
- `VITE_BACKEND_ORIGIN` (example: `http://localhost:8080`)

## Deploy (Vercel)

- Root directory: `apps/pwa`
- Framework preset: Vite
- Set `VITE_API_BASE_URL` to your deployed backend API base URL.
