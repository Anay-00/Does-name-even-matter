# MediSync Frontend

React app for public SOS, role-based dashboards, and real-time emergency operations.

## Setup

1. Copy `.env.example` to `.env`.
2. Set `REACT_APP_API_BASE_URL` to the running backend URL.
3. (Optional) set `REACT_APP_GEMINI_API_KEY` for AI chatbot responses.
4. Install dependencies: `npm install`

## Scripts

- `npm start` : run local dev server.
- `npm run build` : production build.
- `npm test -- --watchAll=false` : run tests once.

## Integrated Flows

- Live login for hospital/admin roles via backend auth.
- Public SOS request creation + status tracking.
- Role dashboard queue management:
  - list/filter requests
  - accept/reject responses
  - retry allocation
  - manual dispatch request creation
- Admin command-center metrics with wall-mode view.

## Notes

- Frontend consumes backend APIs under `/api/v1`.
- SSE updates are consumed from `/api/v1/events`.
