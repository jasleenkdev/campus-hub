# CampusHub

A campus management application — Node.js/Express/MongoDB backend with a Next.js frontend for students, courses, events, registrations, and announcements.

## Stack

**Backend:** Node.js, Express, MongoDB (Mongoose), JWT auth, bcrypt, Helmet, CORS, express-rate-limit, Morgan.

**Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4.

## Project Structure

```
campus-hub/
├── backend/
│   ├── controllers/
│   ├── services/
│   ├── repositories/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── dtos/
│   ├── db/
│   └── index.js
├── frontend/
│   └── src/
│       ├── api/            # centralized API client — only layer that talks to the backend
│       ├── app/             # Next.js App Router pages
│       ├── components/
│       └── lib/             # auth context, formatting helpers
└── FRONTEND_API_MAP.md      # full endpoint-by-endpoint API contract
```

## Getting Started

### Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in MONGO_URI and JWT_SECRET
npm start
```
Runs on `http://localhost:8000` by default (`PORT` env var to override).

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL to your backend URL
npm run dev
```
Runs on `http://localhost:3000`.

## Features

| Area | What's supported |
|---|---|
| Auth | Signup, login, JWT-based sessions, protected routes |
| Students | List (search/sort/filter/pagination), detail, create, edit, delete |
| Courses | List, create |
| Events | List, create, register (server-backed registration state) |
| Announcements | List, create (newest-first) |
| Profile | Read-only, includes your event registrations |

Course, event, and announcement editing/deletion are not implemented — see `FRONTEND_API_MAP.md` for the exact API surface.


## Environment Variables

**Backend** (`.env`): `MONGO_URI`, `JWT_SECRET`, `PORT` (optional, defaults to 8000).

**Frontend** (`.env.local`): `NEXT_PUBLIC_API_URL` — the backend's base URL. Never put backend secrets in frontend env files.

## API Documentation

See [`FRONTEND_API_MAP.md`](./FRONTEND_API_MAP.md) for the full endpoint reference: methods, auth requirements, request/response shapes, and error cases, derived directly from the backend source.
