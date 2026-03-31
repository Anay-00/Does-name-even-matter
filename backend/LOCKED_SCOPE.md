# MediSync Locked Scope (Approved)

## Rollout

- Build target: working on local machine.
- City: Indore (around AITR).
- Scope: single city now, multi-city-ready data model.

## Roles

- super_admin
- admin
- hospital_admin_staff
- dispatch_operator (hospital-bound)
- doctor
- nurse
- ambulance_provider_operator
- public_requester

## Authentication

- Email/password for dashboard roles.
- Public requester supports guest and account mode.
- OTP mode is mock for phase 1.

## Emergency Workflow

- Existing public emergency form is baseline.
- Request can be made for another patient.
- Duplicate request prevention is enabled.
- Cancellation allowed until resources are assigned, including pending window.
- On cancellation, reservations are released immediately and request is closed.
- After request submission, same public screen supports optional image upload and AI first-aid guidance.
- AI guidance supports multilingual responses and symptoms-only text input.
- Warning line shown: "This guidance is supportive, not a medical diagnosis."

## Emergency Categories

- cardiac
- respiratory
- trauma
- stroke
- poisoning
- bleeding
- unconsciousness
- pregnancy_emergency
- pediatric_emergency
- accident
- other

## Priority

- critical, high, medium, low.
- Triage assigns a minimum priority from symptoms.
- Operators can increase priority but cannot reduce below triage floor.

## Allocation

- Joint allocation is required: hospital + ambulance together.
- Multi-resource allocation is supported.
- Hospital must actively accept within 60 seconds.
- If no acceptance in 60 seconds, auto-reject and fallback to next candidate.
- No partial assignment if ambulance is unavailable.
- Search radius max: 35 km.
- Radius ladder: 5 km -> 10 km -> 20 km -> 35 km.
- Reservation TTL: 90 seconds per attempt.
- Reliability score remains neutral now.

## Tracking and Routing

- Requester, assigned hospital, and admin can track assigned ambulance live.
- Requester tracking stops when ambulance reaches patient.
- Route deviation alerts go to dispatch + hospital.
- Routing strategy: OSRM/Valhalla first, straight-line fallback.
- Driver navigation is in-app.
- GPS update interval target: 5 seconds.

## Dashboards

- Admin dashboard includes command-center wall mode (read-only fullscreen auto-refresh).
- Hospital dashboard modules are fully functional, no placeholders.
- Dispatch can manually create requests and retry allocation for hospital-linked cases.

## Delivery Rule

- Strict completion gates: each module must pass tests before moving to next module.
- No shortcuts and no deferred essential functionality.
