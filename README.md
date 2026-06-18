# Quick Attendance

A full-stack, location-verified digital attendance platform for educational
institutions. Course representatives and administrators create attendance
sessions and share a link / QR code; students sign in only when they are
physically present within a configured radius of the class location. The
system computes per-course and semester attendance, tracks exam eligibility,
and ships with multiple anti-cheating safeguards.

**Stack:** Python (Flask) · PostgreSQL · React + Vite · JWT auth · Docker

---

## Table of contents
1. [Features](#features)
2. [System architecture](#system-architecture)
3. [Database schema](#database-schema)
4. [Project structure](#project-structure)
5. [Quick start (local, zero-config)](#quick-start-local-zero-config)
6. [Quick start with Docker + PostgreSQL](#quick-start-with-docker--postgresql)
7. [API reference](#api-reference)
8. [Authentication flow](#authentication-flow)
9. [Attendance & geolocation flow](#attendance--geolocation-flow)
10. [Anti-cheating system](#anti-cheating-system)
11. [Analytics & reporting](#analytics--reporting)
12. [Security](#security)
13. [Limitations of a 10-foot GPS geofence & better alternatives](#limitations-of-a-10-foot-gps-geofence--better-alternatives)
14. [Implementation roadmap](#implementation-roadmap)
15. [Testing](#testing)

---

## Features
- **Auth & RBAC** — register/login with JWT (access + refresh), three roles:
  Super Administrator, Administrator, Course Representative.
- **Courses & enrollment** — create courses, enroll students, manage lists.
- **Attendance sessions** — create sessions, auto-generate a shareable link,
  a QR code, and a session ID; open/close sessions.
- **Location verification** — Browser Geolocation API + server-side Haversine
  distance check against the class coordinates and allowed radius (~3 m / 10 ft default).
- **Anti-cheating** — one device per session, duplicate matric prevention,
  fraud flagging, and an admin review/override workflow.
- **Analytics** — per-course breakdowns, semester rankings, exam eligibility,
  charts (bar/pie), and Excel exports (pandas + openpyxl).
- **Settings** — change username/password/profile; admins set the eligibility threshold.

## System architecture

```
┌──────────────┐      HTTPS / JSON      ┌────────────────────┐     SQL      ┌──────────────┐
│  React + Vite │  ───────────────────▶ │   Flask REST API    │ ───────────▶ │  PostgreSQL   │
│   SPA (nginx) │ ◀───────────────────  │  (gunicorn workers) │ ◀─────────── │   database    │
└──────────────┘   JWT Bearer tokens    └────────────────────┘              └──────────────┘
       │                                          │
       │  Browser Geolocation API                 │  Haversine verification, anti-cheating,
       │  device fingerprint + QR scan            │  analytics, Excel export, rate limiting
       ▼                                          ▼
   Student phone                          Flask-Limiter / JWT / Argon2
```

- **Frontend**: React SPA served by nginx, which also reverse-proxies `/api`.
- **Backend**: Flask application factory with blueprints, SQLAlchemy models,
  Flask-JWT-Extended, Flask-Limiter, Flask-Migrate, CORS, secure headers.
- **Database**: PostgreSQL in production; SQLite for zero-config local dev.
- **Stateless API**: horizontally scalable behind a load balancer; move rate-limit
  storage to Redis for multi-instance deployments.

## Roles & data visibility

The platform uses a three-tier hierarchy (`users.admin_id` links a course rep to
their administrator):

| Role | Manages | Sees |
|---|---|---|
| **Super Administrator** | Everyone; can change any user's role | All users, courses, sessions, records, analytics |
| **Administrator** | Only the course reps registered under them (enable/disable) | Only their own course reps, and the courses / sessions / records / analytics owned by those reps. **Cannot see the super admin or other admins.** |
| **Course Representative** | Their own courses & sessions | Only their own courses, sessions, records, analytics |

- A course rep **registers under a specific admin** by supplying that admin's
  username or email at sign-up (`admin_identifier`); the link is stored in
  `users.admin_id`.
- Data scoping is centralised in `visible_owner_ids(user)`
  (`app/utils/decorators.py`): super admin → unrestricted, admin → self + reps,
  course rep → self. Every course/session/record/analytics query is filtered through it.
- Only a super admin can change roles. An admin can only enable/disable the reps
  beneath them.

## Database schema

```
users (id, full_name, username⋆, email⋆, password_hash, role, is_active,
       admin_id→users (the admin a course rep belongs to), created_at)
   │ 1─* owns
courses (id, course_code, course_name, semester, owner_id→users, created_at)
   │ 1─*                         │ 1─*
course_enrollments              attendance_sessions
 (id, student_id→students,       (id, public_token⋆, course_id→courses, title,
  course_id→courses) ⋆unique      session_date, start_time, end_time,
   │                              location_lat, location_lng, allowed_radius,
students                          is_open, created_at)
 (id, matric_number⋆, full_name,    │ 1─*
  email, department, level)         attendance_records
   │ 1─*  ────────────────────────▶ (id, session_id→sessions, student_id→students,
                                      device_id, ip_address, user_agent,
system_settings (key, value)         latitude, longitude, distance_m,
                                      attendance_status, flag_reason, timestamp)
```

Attendance percentages are **derived on demand** from `attendance_sessions` +
valid `attendance_records`, so analytics never drift out of sync (no
denormalised counters to maintain).

## Project structure

```
quick-attendance/
├── backend/
│   ├── app/
│   │   ├── __init__.py          # application factory
│   │   ├── config.py            # env-driven configuration
│   │   ├── extensions.py        # db, jwt, migrate, cors, limiter
│   │   ├── models/              # SQLAlchemy models
│   │   ├── api/                 # blueprints: auth, courses, sessions,
│   │   │                        #   attendance, analytics, users, reports
│   │   ├── services/            # analytics_service
│   │   └── utils/               # geo (Haversine), security, qr, decorators
│   ├── tests/test_app.py
│   ├── requirements.txt
│   ├── wsgi.py                  # gunicorn entrypoint
│   ├── seed.py                  # demo data
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/client.js        # axios + token refresh
│   │   ├── context/AuthContext.jsx
│   │   ├── components/Layout.jsx
│   │   └── pages/               # Landing, Login, Register, Dashboard,
│   │                            #   Courses, CourseDetail, Sessions, Records,
│   │                            #   Analytics, Settings, Admin, Attend
│   ├── package.json
│   ├── vite.config.js
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
└── README.md
```

## Quick start (local, zero-config)

The backend defaults to a local SQLite database, so no PostgreSQL is required to try it.

```bash
# 1. Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python seed.py            # optional demo data + login credentials
python wsgi.py            # serves http://localhost:5000

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev               # serves http://localhost:5173 (proxies /api to :5000)
```

Open http://localhost:5173. Demo logins (after `seed.py`):
`superadmin / Admin@1234`, `admin / Admin@1234`, and
`courserep / Rep@12345` (the course rep is registered under `admin`).

> **Upgrading an existing local database:** this change adds the `users.admin_id`
> column. `db.create_all()` does not alter existing tables, so for local SQLite
> dev delete the old DB (`backend/quick_attendance.db` / `backend/instance/*.db`)
> and re-run `python seed.py`. In production, generate a migration with
> `flask db migrate` / `flask db upgrade`.

> Geolocation requires a **secure context**. `localhost` is treated as secure
> by browsers, so testing works locally. In production you must serve over HTTPS.

## Quick start with Docker + PostgreSQL

```bash
# from the project root
export SECRET_KEY=$(openssl rand -hex 32)
export JWT_SECRET_KEY=$(openssl rand -hex 32)
docker compose up --build
```

- Frontend: http://localhost:8080
- Backend API: http://localhost:5000
- PostgreSQL: localhost:5432 (db `quick_attendance`)

Seed inside the running backend container:

```bash
docker compose exec backend python seed.py
```

## API reference

Base path `/api`. Protected routes require `Authorization: Bearer <access_token>`.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | – | Create account (course_rep / admin) |
| POST | `/auth/login` | – | Login with username **or** email |
| POST | `/auth/refresh` | refresh | New access token |
| GET | `/auth/me` | yes | Current user |
| GET/POST | `/courses` | yes | List / create courses |
| GET/DELETE | `/courses/{id}` | yes | Course detail / delete |
| POST | `/courses/{id}/students` | yes | Enroll a student |
| DELETE | `/courses/{id}/students/{sid}` | yes | Unenroll |
| GET/POST | `/sessions` | yes | List / create sessions (returns link + QR) |
| GET | `/sessions/{id}` | yes | Session detail + QR |
| POST | `/sessions/{id}/close` | yes | Close a session |
| GET | `/attendance/session/{token}` | – | Public session info (student page) |
| POST | `/attendance/session/{token}/submit` | – | Submit attendance (geo + anti-cheat) |
| GET | `/attendance/records` | yes | List/filter/search records |
| PATCH | `/attendance/records/{id}` | yes | Approve / void a record |
| GET | `/analytics/course/{id}` | yes | Per-course report |
| GET | `/analytics/semester` | yes | Semester report |
| GET | `/analytics/courses` | yes | Cross-course averages |
| GET | `/analytics/eligibility` | yes | Eligible / ineligible lists |
| GET | `/reports/course/{id}/excel` | yes | Course report `.xlsx` |
| GET | `/reports/semester/excel` | yes | Semester report `.xlsx` |
| PATCH | `/users/me/{profile,username,password}` | yes | Account settings |
| GET/PATCH | `/users` , `/users/{id}` | admin | User administration |
| GET/PATCH | `/users/settings` | yes/admin | Eligibility threshold |

## Authentication flow
1. Register/login → backend verifies credentials (Argon2) and returns a short-lived
   **access token** + long-lived **refresh token** with role claims.
2. The SPA stores tokens and attaches the access token to every request.
3. On a `401`, the axios interceptor transparently calls `/auth/refresh` once and retries.
4. `roles_required(...)` enforces role-based access on each protected endpoint.

## Attendance & geolocation flow
1. A rep creates a session, **capturing the class GPS coordinates** in the browser.
2. The backend stores `location_lat/lng` + `allowed_radius` and returns a link + QR.
3. A student opens the link, the browser requests GPS, and submits name + matric + device id + coordinates.
4. The backend computes the **Haversine distance**; if it exceeds the radius the
   submission is **rejected** with the measured distance. Otherwise the record is stored.

## Anti-cheating system
- **One device per session** — if a `device_id` is reused for a *different*
  student in the same session, **every** record from that device is set to
  `invalidated` and flagged with a reason.
- **Duplicate prevention** — a matric number cannot sign twice (existing
  valid/flagged record blocks re-submission).
- **Fraud flagging** — submissions from students not enrolled in the course are
  `flagged` for manual review.
- **Captured evidence** — device id, IP, user-agent, GPS, distance and timestamp
  are stored on every record; admins can approve or void via the Records page.

## Analytics & reporting
- **Per course**: classes held, attended, missed, percentage, status
  (Excellent ≥90, Good Standing ≥75, Warning ≥50, Below Requirement <50).
- **Semester**: overall % across all courses, rankings, eligibility vs threshold.
- **Charts**: average attendance per course (bar), eligibility split (pie).
- **Excel export** via pandas + openpyxl (course sheet, and semester workbook with
  Overall / Eligible / Ineligible sheets).

## Security
- Passwords hashed with **Argon2** (`argon2-cffi`).
- **JWT** access/refresh tokens with role claims; RBAC decorators.
- **Rate limiting** (Flask-Limiter) on register/login/submit; move to Redis in prod.
- **Secure headers** (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy: geolocation=(self)`), CORS allow-list.
- **Server-side** location verification and session time-window checks — clients
  cannot self-certify presence.
- Input validation for email, username and password strength.

> Production checklist: set strong `SECRET_KEY`/`JWT_SECRET_KEY`, serve over HTTPS,
> restrict `CORS_ORIGINS`, use Redis for rate limiting, run `flask db` migrations
> instead of `create_all`, and put the API behind a reverse proxy.

## Limitations of a 10-foot GPS geofence & better alternatives

A strict ~3 m (10 ft) geofence enforced purely with **browser GPS is not reliable**:

- **Consumer GPS accuracy is 5–20 m** in the open and far worse indoors / between
  buildings, where most classes happen. A 3 m radius is *smaller than the sensor
  error*, so genuine students are routinely rejected and a few absent ones slip through.
- **GPS is spoofable** — emulators, mock-location apps and dev tools can fake coordinates.
- **Multipath & urban canyon** effects scatter readings near concrete/glass.
- **Cold starts** can take 10–30 s and drain accuracy on first fix.

Recommended, more reliable approaches (ordered, and ideally combined):

1. **QR Code + GPS (hybrid)** — display a **rotating, short-lived QR** on the
   projector that students must scan *and* pass a looser GPS check (e.g. 30–50 m).
   The rotating code defeats "screenshot-and-share"; GPS adds a coarse sanity check.
2. **Campus Wi-Fi / network verification** — accept only submissions whose request
   originates from the campus/lecture-hall network (BSSID or egress IP range). Hard
   to fake remotely and works indoors where GPS fails.
3. **Bluetooth Low Energy beacons** — a classroom beacon broadcasts a rotating
   token the phone must report; proximity is metres-accurate and indoor-friendly.
4. **Hybrid scoring** — combine signals (rotating QR + Wi-Fi/IP + coarse GPS +
   device uniqueness) into a confidence score; auto-accept high confidence,
   flag the middle band for review, reject the rest.

This project already implements **layer 1** (QR + GPS + device uniqueness + IP
capture) and is structured so Wi-Fi/IP and BLE checks can be added in the submit
endpoint. For real deployments, **loosen the radius to a realistic 20–50 m** and
lean on the rotating QR + network checks rather than the GPS radius alone.

## Implementation roadmap

| Phase | Deliverables |
|---|---|
| **0. Setup** | Repo, Docker, CI, env config, base schema (✅ in this repo) |
| **1. Core** | Auth + RBAC, courses, enrollment, sessions, QR (✅) |
| **2. Attendance** | Public submit, Haversine geofence, device/duplicate rules (✅) |
| **3. Analytics** | Course/semester reports, eligibility, charts, Excel (✅) |
| **4. Hardening** | Redis rate-limit, `flask db` migrations, HTTPS, audit logs, tests in CI |
| **5. Reliability** | Rotating QR, Wi-Fi/IP + BLE verification, hybrid scoring |
| **6. Scale** | Read replicas, caching, background workers for reports, observability |
| **7. Launch** | Load testing, pen-test, backups/DR, staged rollout |

## Testing

```bash
cd backend && source .venv/bin/activate
pip install pytest
pytest -q
```

Covers health, Argon2 auth, password strength, the Haversine calculation, the
full attendance flow (geofence reject/accept, duplicate matric, same-device
invalidation) and analytics.
