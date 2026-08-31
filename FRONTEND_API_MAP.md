# CampusHub — Frontend API Map

**Source of truth:** `backend/` source, read in full, plus live probes against `http://localhost:8000` on 2026-08-31.
Nothing here is inferred from convention — every shape below was either read in the controller or observed in an actual HTTP response.

> **Authorized backend fixes have been applied** — **L1** (error-handler ordering),
> **L2** (student DTO exposes the course), and **L6 / L6a / L6b** (registration auth, event existence,
> duplicate enforcement), in commits `75c87c9d`, `2e67c63c`, `d83a0a67` and `777afb7d`. They are marked **FIXED** below and this document describes the
> **post-fix** behavior, re-verified against the running server. Every other backend limitation listed
> here is still present and unmodified.

---

## 1. Backend architecture

```
index.js
  ├── express.json()                      body parsing
  ├── hard exit if !process.env.JWT_SECRET
  ├── cors()                              wide open: Access-Control-Allow-Origin: *
  ├── helmet()                            security headers
  ├── rateLimit  100 req / 15 min         global (2000 when RATE_LIMIT_RELAXED)
  ├── morgan("dev")                       logging
  ├── GET  /                              text/html "Welcome to CampusHub"
  ├── GET  /api                           text/html "CampusHub API is running"
  ├── /api/students        → studentRoutes       (authMiddleware on every route)
  ├── /api/courses         → courseRoutes        (public)
  ├── /api/auth            → authLimiter (10/15min) + authRoutes  (public)
  ├── /api/profile         → profileRoutes       (authMiddleware)
  ├── /api/events          → eventRoutes         (public)
  ├── /api/registrations   → registrationRoutes  (authMiddleware on both routes)
  ├── /api/announcements   → announcementRoutes  (public)
  └── errorHandler          ← fixed, now mounted after every route
```

Layering is inconsistent by design/evolution: only **students** has the full
`route → middleware → controller → service → repository → DTO` stack. Courses, events,
announcements, registrations and auth are `route → controller → Mongoose model` directly,
with no service, no repository and no DTO.

- Express **5.2.1**, Mongoose **9.9.4**, Node 22.
- `db/index.js` connects with a TLS secure context pinned to `TLSv1.2` min *and* max, then logs the `Student` collection indexes. On connection failure it calls `process.exit(1)`, so the HTTP server never starts.
- Graceful shutdown on `SIGINT` only (`server.close()` → `mongoose.connection.close()`). No `SIGTERM` handler.

## 2. Authentication flow

```
POST /api/auth/signup   { name, email, password }
        ↓ bcrypt.hash(password, 10) → User.create
        ↓ 201 { message, user:{ id, name, email } }        ← no token issued
POST /api/auth/login    { email, password }
        ↓ User.findOne({email}) → bcrypt.compare
        ↓ jwt.sign({ userId }, JWT_SECRET, { expiresIn: "1h" })
        ↓ 200 { message, token, user:{ id, name, email } }
Client stores token → sends `Authorization: Bearer <token>` on protected calls
        ↓ authMiddleware: jwt.verify → req.user = { userId, iat, exp }
POST /api/auth/logout   → 200 { message } — stateless no-op, no blocklist
```

- Token lifetime **1 hour**. There is no refresh endpoint, so the frontend must treat any 401 as "session over".
- **Signup does not return a token** — after signup the frontend must call login separately.
- There are **no roles and no ownership checks anywhere**. Auth is binary: valid token or not. Any logged-in user can edit or delete any student.
- `authMiddleware` splits on a space and does not verify the `Bearer` scheme, so `Authorization: NotBearer <token>` is accepted if the second word is a valid JWT; a missing header is 401 `"Access denied. No token provided."`, and anything unverifiable is 401 `"Invalid or expired token"`.

## 3. Models and relationships

```
User          { name, email (unique), password (bcrypt) } + timestamps
Student       { name, course → ObjectId ref "Course" (required) }
                indexes: { course: 1 }, { name: 1 }
Course        { name, duration: Number }          ← models/courseModel.js (the live one)
Event         { title, description, date: Date, location }   all required
Announcement  { title, message, date: Date default Date.now }
Registration  { user → ref "User", event → ref "Event" }      both required
                unique compound index { user: 1, event: 1 }    ← added by fix L6b
```

**`Student.course → Course`** is the only relationship the API traverses: `studentRepository.getStudents()`
and `getStudentById` both `.populate("course")`, and since fix **L2** the DTO exposes the populated course
object on both read paths.

**Dead file:** `models/course.js` declares a *second* `mongoose.model("Course", …)` with a different
schema (`{ name, code, description }`). Nothing requires it. If anything ever did, Mongoose would
throw `OverwriteModelError`. The live Course schema is `models/courseModel.js` = `{ name, duration }`.

## 4. Response shapes — three coexisting conventions

| Convention | Used by |
|---|---|
| `{ success, message, data }` | `GET /api/students`, `GET /api/students/:id`, and the two "Invalid course ID" errors |
| `{ message, student }` | `POST/PUT/PATCH /api/students` (raw Mongoose doc, `_id` + `__v`, `course` unpopulated) |
| Raw doc / raw array | all of courses, events, announcements, registrations, `GET /api/profile` |

Error bodies are `{ message }` on every route group (announcements included, since L1 was fixed).
**All 404s for unmatched paths are still Express's HTML page** (L12), so the frontend error handler
must still never assume the response body is JSON.

---

# Endpoints

### GET /
- **Auth:** none
- **Success:** `200`, `Content-Type: text/html` — body is the literal string `Welcome to CampusHub`
- **Frontend usage:** none (not an API endpoint)

### GET /api
- **Auth:** none
- **Success:** `200`, `text/html` — `CampusHub API is running`
- **Frontend usage:** optional backend-reachability check on the login screen

---

## Auth — `/api/auth` (rate limited to 10 requests / 15 min per IP; 200 when `RATE_LIMIT_RELAXED=true`)

### POST /api/auth/signup
- **Auth:** none
- **Request body:** `{ "name": string, "email": string, "password": string }`
- **Success `201`:**
  ```json
  { "message": "User created successfully",
    "user": { "id": "6a95abf25b99b10400140c90", "name": "Test User", "email": "probe@campushub.test" } }
  ```
  ⚠️ No token. Frontend must call `/api/auth/login` afterwards.
- **Errors:**
  - `400` `{ "message": "Name, email and password are required" }` — any field missing/falsy
  - `409` `{ "message": "User already exists" }`
  - `429` express-rate-limit plain-text body after 10 attempts
- **Frontend usage:** Signup page → auto-login on success.

### POST /api/auth/login
- **Auth:** none
- **Request body:** `{ "email": string, "password": string }`
- **Success `200`:**
  ```json
  { "message": "Login successful",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....",
    "user": { "id": "6a95abf25b99b10400140c90", "name": "Test User", "email": "probe@campushub.test" } }
  ```
- **Errors:**
  - `400` `{ "message": "Email and password are required" }`
  - `401` `{ "message": "Invalid email or password" }` — same message for unknown email and wrong password
  - `429` after 10 attempts / 15 min
- **Frontend usage:** Login page. Persist `token` + `user`.

### POST /api/auth/logout
- **Auth:** none (does not read the token)
- **Request body:** none
- **Success `200`:** `{ "message": "Logout successful" }`
- **Errors:** none reachable
- **Frontend usage:** Logout action — fire-and-forget; the real logout is clearing client state.

---

## Profile — `/api/profile`

### GET /api/profile
- **Auth:** **Bearer token required**
- **Success `200`:** *(not enveloped)*
  ```json
  { "id": "6a95abf25b99b10400140c90", "name": "Test User", "email": "probe@campushub.test" }
  ```
- **Errors:**
  - `401` `{ "message": "Access denied. No token provided." }`
  - `401` `{ "message": "Invalid or expired token" }`
  - `404` `{ "message": "User not found" }` — valid token, deleted user
  - `500` `{ "message": "Server error" }`
- **Frontend usage:** Auth bootstrap (validates the stored token on load), Profile page, header user chip.
- ⚠️ **Read-only.** There is no `PUT`/`PATCH /api/profile`. The Profile page must be display-only.

---

## Students — `/api/students` (every route requires a Bearer token)

### GET /api/students
- **Auth:** Bearer token required
- **Query params:** all optional
  | param | behavior |
  |---|---|
  | `name` | exact-match filter on `name` |
  | `course` | ObjectId; validated → `400` if malformed |
  | `search` | case-insensitive regex on `name`; **overwrites `name`** if both are sent |
  | `sort` | passed straight to Mongoose `.sort()` — `name`, `-name`, `course`, `-course` |
  | `page` | default `1` (`Number(page) || 1`) |
  | `limit` | default `10` (`Number(limit) || 10`) |
- **Success `200`:**
  ```json
  { "success": true, "message": "Students fetched successfully",
    "data": [ { "id": "6a95bcf0eba6001d27c31914", "name": "DTO Probe",
                "course": { "id": "6a95639d921fb367a213a968", "name": "Computer Science", "duration": 4 } } ] }
  ```
  `course` is the **populated course object** (fix L2), or `null` when the reference resolves to nothing
  (see D1 — most seeded students have a legacy string in `course`). **No total count is returned**, so
  true pagination UI is impossible (L3).
- **Errors:**
  - `400` `{ "success": false, "message": "Invalid course ID" }`
  - `401` `{ "message": "Access denied. No token provided." }` / `{ "message": "Invalid or expired token" }`
  - `500` `{ "message": "Server error" }`
- **Frontend usage:** Students list — server-side `search`, `sort`, `page`, `limit`.

### GET /api/students/:id
- **Auth:** Bearer token required
- **Path params:** `id` — validated with `mongoose.Types.ObjectId.isValid`
- **Success `200`:**
  ```json
  { "success": true, "message": "Student fetched successfully",
    "data": { "id": "6a958ad9cbac5c39e7fbf7aa", "name": "Validation Test",
              "course": { "id": "6a95639d921fb367a213a968", "name": "Computer Science", "duration": 4 } } }
  ```
  Same populated `course` object as the list, or `null` for an unresolvable reference (fix L2, and D1).
- **Errors:**
  - `400` `{ "message": "Invalid student ID" }` *(not enveloped)*
  - `404` `{ "message": "Student not found" }`
  - `401` as above
- **Frontend usage:** Student detail page.

### POST /api/students
- **Auth:** Bearer token required — ⚠️ but `validateStudent` runs **before** `authMiddleware`, so an
  unauthenticated request with a bad body gets `400`, not `401` (see L5).
- **Request body:** `{ "name": string, "course": <Course ObjectId string> }`
- **Success `201`:** *(not enveloped, raw Mongoose doc, `course` NOT populated)*
  ```json
  { "message": "Student created successfully",
    "student": { "name": "Probe Student", "course": "6a95639d921fb367a213a968",
                 "_id": "6a95ac095b99b10400140c91", "__v": 0 } }
  ```
- **Errors:**
  - `400` `{ "message": "Name and course are required" }` (middleware, fires pre-auth)
  - `400` `{ "message": "Name and course must be strings" }`
  - `400` `{ "message": "Name and course cannot be empty" }`
  - `400` `{ "success": false, "message": "Name and course are required" }` (controller)
  - `400` `{ "success": false, "message": "Invalid course ID" }`
  - `401` as above · `500` `{ "message": "Server error" }`
- **Frontend usage:** "Add student" form — course chosen from a `GET /api/courses` dropdown.

### PUT /api/students/:id  ·  PATCH /api/students/:id
Both methods are wired to the **same** `updateStudent` handler — identical behavior, both do a full
`findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })`.
- **Auth:** Bearer token required (no ownership check — any user may edit any student)
- **Request body:** any subset of `{ name, course }`. Unknown keys are ignored by the schema.
- **Success `200`:** *(not enveloped, raw doc, `course` unpopulated)*
  ```json
  { "message": "Student updated successfully",
    "student": { "_id": "…", "name": "Probe Renamed", "course": "6a95639d921fb367a213a968", "__v": 0 } }
  ```
- **Errors:**
  - `404` `{ "message": "Student not found" }`
  - ⚠️ `500` `{ "message": "Server error" }` for a **malformed `:id`** — no ObjectId guard here, the
    `CastError` falls through to the error handler (see L4)
  - ⚠️ `500` `{ "message": "Server error" }` for **validation failures** (e.g. `{"name":""}`) — the
    Mongoose `ValidationError` is not mapped to 400
  - `401` as above
- **Frontend usage:** "Edit student" form. Must client-validate name/course *before* submitting,
  because the backend answers bad input with an opaque 500.

### DELETE /api/students/:id
- **Auth:** Bearer token required (no ownership check)
- **Path params:** `id` — ObjectId-validated
- **Success `200`:** `{ "message": "Student deleted successfully" }` *(no body echo)*
- **Errors:** `400` `{ "message": "Invalid student ID" }` · `404` `{ "message": "Student not found" }` · `401` as above
- **Frontend usage:** Delete action behind a confirmation dialog; revalidate the list after.

---

## Courses — `/api/courses`

### GET /api/courses
- **Auth:** **none** (public)
- **Query params:** none — no pagination, no filtering, no sorting
- **Success `200`:** *(raw array of Mongoose docs)*
  ```json
  [ { "_id": "6a95639d921fb367a213a968", "name": "Computer Science", "duration": 4, "__v": 0 } ]
  ```
- **Errors:** `500` `{ "message": "Server error" }`
- **Frontend usage:** Courses list; course dropdown in the student create/edit forms; local lookup map
  to resolve `course` ObjectIds returned by student mutations.

### POST /api/courses
- **Auth:** **none** (public — anyone can create a course)
- **Request body:** `{ "name": string, "duration": number }`
- **Success `201`:** raw doc — `{ "_id": "…", "name": "…", "duration": 4, "__v": 0 }`
- **Errors:** ⚠️ `500` `{ "message": "Server error" }` for a missing/invalid field — Mongoose
  `ValidationError` is never mapped to 400
- **Frontend usage:** "Add course" form (client-side validation required).

⚠️ **No `GET /api/courses/:id`, no update, no delete** — all return the HTML 404. Course detail must be
rendered from the list response the frontend already holds.

---

## Events — `/api/events`

### GET /api/events
- **Auth:** **none** (public)
- **Query params:** none — no pagination, no sorting (insertion order)
- **Success `200`:** *(raw array)*
  ```json
  [ { "_id": "6a94704c58cd8cc51297cae3", "title": "Hackathon 2026",
      "description": "24-hour coding competition", "date": "2026-09-15T00:00:00.000Z",
      "location": "Main Auditorium", "__v": 0 } ]
  ```
  `date` is an ISO-8601 UTC string. It was stored from a date-only input, so it lands at `T00:00:00.000Z`
  — render it in **UTC**, not local time, or dates shift a day west of Greenwich.
- **Errors:** `500` `{ "message": "Server error" }`
- **Frontend usage:** Events list, event detail (rendered from the list), dashboard "upcoming events".

### POST /api/events
- **Auth:** **none** (public)
- **Request body:** `{ "title": string, "description": string, "date": string|Date, "location": string }` — all four required by the schema
- **Success `201`:** raw doc
- **Errors:** ⚠️ `500` `{ "message": "Server error" }` on any validation failure or unparseable `date`
- **Frontend usage:** "Create event" form (client-side validation required).

⚠️ **No `GET /api/events/:id`, no update, no delete** — HTML 404. Event detail is client-side, sourced
from the list.

---

## Registrations — `/api/registrations`

### GET /api/registrations/me  *(added — commit `e417fae9`)*
- **Auth:** **Bearer token required.** The query is scoped by `req.user.userId`; there is no way for a
  client to request another user's rows.
- **Query/path params:** none
- **Success `200`:** *(raw array, unpopulated — `event` is an ObjectId string)*
  ```json
  [ { "_id": "6a95b15ee5b87dbe64f3052a", "user": "6a95b15ee5b87dbe64f30529",
      "event": "6a94704c58cd8cc51297cae3", "__v": 0 } ]
  ```
  Returns `[]` for a user with no registrations.
- **Errors:** `401` (missing / invalid token) · `500` `{ "message": "Server error" }`
- **Frontend usage:** loaded once on the Events page and the dashboard to build a set of registered
  event ids, so `Registered` badges are accurate **before** the user interacts.
- ⚠️ `event` is **not** populated — join it against `GET /api/events` client-side.

### POST /api/registrations  *(behavior changed — L6 fixed)*
- **Auth:** **Bearer token required.** The registering user is taken from the verified token
  (`req.user.userId`); a `userId` in the request body is **ignored** (verified — a spoofed `userId`
  was discarded and the token's user was stored).
- **Request body:** `{ "eventId": <Event ObjectId> }` — `eventId` only. The stored field is `event`.
- **Success `201`:** *(raw doc, unpopulated)*
  ```json
  { "user": "6a95adc7f6685f279e9abaf0", "event": "6a94704c58cd8cc51297cae3",
    "_id": "6a95adc7f6685f279e9abaf1", "__v": 0 }
  ```
- **Errors:**
  - `400` `{ "message": "eventId is required" }`
  - `400` `{ "message": "Invalid event ID" }` — malformed ObjectId
  - `401` `{ "message": "Access denied. No token provided." }` / `{ "message": "Invalid or expired token" }`
  - **`404` `{ "message": "Event not found" }`** — well-formed ObjectId matching no event (fix L6a)
  - **`409` `{ "message": "You are already registered for this event" }`** — same user + same event.
    Backed by a unique `{user, event}` index, so this is returned even when two requests race (fix L6b).
  - `500` `{ "message": "Server error" }`
- **Frontend usage:** "Register" button on an event card/detail. A `409` is **not** an error state to
  surface as a failure — it means the user is already registered, so the button renders as `Registered`.

⚠️ **There is still no cancel/delete endpoint** (deliberately out of scope) — `DELETE /api/registrations/:id`
is an HTML 404. Consequences for the UI:
- The `Registered` state is **fully server-backed**: `GET /api/registrations/me` supplies it on load, and
  `POST` confirms it on interaction (`201` newly registered, `409` already registered).
- **No `Cancel` control is built**, since no cancel endpoint exists. Registration remains irreversible
  through the API.

---

## Announcements — `/api/announcements`

### GET /api/announcements
- **Auth:** **none** (public)
- **Query params:** none — no pagination, no sorting (insertion order, **not** newest-first)
- **Success `200`:** *(raw array)*
  ```json
  [ { "_id": "6a9554c3e2d291bd6029a73c", "title": "Hackathon Registration Open",
      "message": "Registration for Hackathon 2026 is now open.",
      "date": "2026-08-31T10:17:39.262Z", "__v": 0 } ]
  ```
- **Errors:** ⚠️ a thrown error here is **HTML**, not JSON (see L1)
- **Frontend usage:** Announcements list, dashboard "latest announcements" (sorted client-side by `date`).

### POST /api/announcements
- **Auth:** **none** (public)
- **Request body:** `{ "title": string, "message": string }` — `date` defaults to now, server-side
- **Success `201`:** raw doc
- **Errors:** ⚠️ **`500` with an HTML body containing a Mongoose stack trace** on validation failure —
  verified. Not JSON. The API client must detect this.
- **Frontend usage:** "Post announcement" form (client-side validation is the only real guard).

⚠️ **No detail / update / delete** — HTML 404.

---

# Backend limitations & inconsistencies found

**L1 and L6 were authorized and are now FIXED** (see the two commits below). Everything else here is
recorded and **not fixed** — no other backend file was modified.

**L1 — ✅ FIXED** (commit `75c87c9d`, `backend/index.js`) — *`errorHandler` was mounted before `/api/announcements`.*
`index.js` called `app.use(errorHandler)` and only then `app.use("/api/announcements", …)`. Because Express
matches middleware in registration order, an error thrown in an announcement handler never reached the JSON
error middleware and fell through to Express's default handler — `POST /api/announcements {"title":"x"}`
returned **500 with an HTML page containing a full Mongoose stack trace**, a real information leak.
**Fix:** moved the single `app.use(errorHandler)` line below every route registration; the handler's own
logic and every other route's error behavior are untouched.
**Re-verified:** that same request now returns `500 {"message":"Server error"}` with
`Content-Type: application/json`, and `GET /api/announcements` still returns `200`.

**L2 — ✅ FIXED** (commit `2e67c63c`, `backend/dtos/studentDto.js`) — *`studentDto` discarded the course,
defeating the populate.* The repository and `getStudentById` both `.populate("course")`, then the DTO
returned only `{ id, name }`, so no read endpoint exposed a student's course — not even an ObjectId.
**Fix:** the DTO now returns the full **`course: { id, name, duration }`** object. Returning the object
rather than the bare id was chosen deliberately: the document is already in memory from the existing
populate, so it costs no extra query, and it spares the frontend an N+1 lookup against `/api/courses`.
It falls back to the raw id for an unpopulated document and to `null` for a reference that resolves to
nothing. **DTO only** — repository, service, controller and routes untouched.
**Re-verified:** `GET /api/students` and `GET /api/students/:id` both return the populated object;
`POST` and `PUT` responses are **unchanged** (still raw Mongoose docs with `course` as an id string).

**D1 — (data, not code) most seeded students have a legacy string in `course`.** Four of the five
students in the database store `course` as a plain string — `"Computer Science"`, `"Computer Engineering"`,
`"Information Technology"` — rather than a Course ObjectId, evidently predating the current schema. The
schema requires an ObjectId ref, so `.populate()` cannot resolve them and those students return
`course: null`. Only students created through the current API carry a real reference. This is existing
data, not a code defect, and was left untouched. **Frontend impact:** the UI must render a missing course
gracefully rather than assume `course` is always present.

**L3 — `GET /api/students` paginates without a total count.** It returns a bare `data` array with no
`total`/`totalPages`/`hasMore`. Real pagination controls are impossible; the frontend can only
offer prev/next inferred from "did I get a full page". *Fix would be: return `Student.countDocuments(filter)` alongside.*

**L4 — `updateStudent` has no ObjectId guard and no error mapping.** Unlike `getStudentById` and
`deleteStudent`, it never calls `ObjectId.isValid`, so `PUT /api/students/badid` → **500**, and a
Mongoose `ValidationError` (`{"name":""}`) → **500**. Both should be 400.

**L5 — Middleware order on `POST /api/students` puts validation before auth.** `router.post("/", validateStudent, authMiddleware, …)`.
An anonymous caller gets `400 "Name and course are required"` instead of `401`, and can probe the
validation rules without a token. Every other student route is auth-first.

**L6 — ✅ FIXED** (commit `d83a0a67`, `backend/routes/registrationRoutes.js` + `backend/controllers/registrationController.js`)
— *Registrations were unauthenticated and trusted a client-supplied `userId`.* The route had no
`authMiddleware` and the controller read `req.body.userId`, so anyone could register any user for any
event; with no unique index and no existence check, duplicates were created silently (`201` twice, verified).
**Fix:** mounted the existing `authMiddleware` on the route; the controller now takes the user from
`req.user.userId` and ignores any `userId` in the body; `eventId` is checked for presence and ObjectId
validity (`400`); an existing `{user, event}` pair returns **`409`**.
**Re-verified:** no token → `401`; bad token → `401`; missing `eventId` → `400`; malformed `eventId` → `400`;
first register → `201`; second and third → `409 {"message":"You are already registered for this event"}`;
a request carrying a spoofed `userId` stored the **token's** user, not the spoofed one.
**Still out of scope by instruction:** no cancel/delete endpoint. A scoped
`GET /api/registrations/me` was subsequently authorized and added (commit `e417fae9`).

**L6a — ✅ FIXED** (commit `777afb7d`, `backend/controllers/registrationController.js`) — *`eventId` was not
checked for existence.* A well-formed ObjectId matching no `Event` was accepted and stored (`201`). The
controller now loads the event and returns **`404 {"message":"Event not found"}`**.
**Re-verified:** a well-formed ghost id → `404`; malformed → still `400`; missing → still `400`;
no token → still `401`.

**L6b — ✅ FIXED** (commit `777afb7d`, `backend/models/registrationModel.js` + controller) — *the duplicate
guard was check-then-insert, not a constraint.* Two simultaneous requests could both pass `findOne` and
both insert. Adds a **unique compound index on `{user: 1, event: 1}`**, declared before the model is
compiled, and maps the resulting `E11000` duplicate-key error to the same `409` so the loser of a race
gets the right status rather than a 500.
**Re-verified under real concurrency:** 10 simultaneous registrations for one `{user, event}` returned
**exactly one `201` and nine `409`s**, with a single row in the database and no `500`s. Index confirmed
present as `user_1_event_1 { unique: true }`.

**L7 — Three different response envelopes coexist.** `{success,message,data}` on student reads,
`{message,student}` on student writes, raw documents everywhere else — and raw documents leak
`_id`/`__v` rather than a DTO'd `id`. The frontend API layer normalizes all three at the boundary.

**C1 — (authorized change, not a defect) rate limits are now environment-conditional.** `backend/index.js`
previously hard-coded 100 requests / 15 min globally and 10 / 15 min on `/api/auth`. The auth limit in
particular locked automated local checks out for 15 minutes at a time, and — because the global limit made
`GET /api/profile` return 429 — it also masked the frontend bug where a transient failure logged the user
out. The limits are now:

| | default (incl. production) | `RATE_LIMIT_RELAXED=true` |
|---|---|---|
| global | 100 / 15 min | 2000 / 15 min |
| `/api/auth` | 10 / 15 min | 200 / 15 min |

The relaxed values apply **only** when `RATE_LIMIT_RELAXED === "true"` **and** `NODE_ENV !== "production"`,
so the strict values are the default and remain in force if the flag is absent, mistyped, or set by
accident in production. The server logs a warning on boot when the relaxation is active. `RATE_LIMIT_RELAXED`
is documented in `.env.example` and set only in the local (gitignored) `.env`. No other environment is
affected. Commit `3e22db8e`.

**L8 — `dotenv` is used but not declared.** `index.js` calls `require("dotenv").config()` while
`package.json` lists no `dotenv` dependency; it currently resolves only from
`/Users/jasleenkaur/node_modules` (the home directory), so a clean `npm install` elsewhere crashes
on startup. `package.json` also has no `start` script and `npm test` is the default failing stub.

**L9 — `models/course.js` is dead, conflicting code.** It registers a second `mongoose.model("Course")`
with an incompatible schema (`{name, code, description}` vs the live `{name, duration}`). Nothing
imports it; if anything did, Mongoose would throw `OverwriteModelError`.

**L10 — `db/index.js` pins TLS to exactly 1.2 (`minVersion` *and* `maxVersion`).** Starting a second
server instance failed with `tlsv1 alert internal error` from the Atlas host. The currently running
instance connected earlier, so this is environment-dependent and brittle.

**L11 — `search` silently overrides `name`.** In `getStudents`, `filter.name` is set by `name` and then
overwritten by `search`. Sending both is accepted but only `search` applies. The UI exposes one search box.

**L12 — Unknown routes return Express's HTML 404, not JSON.** There is no 404 catch-all. Any
`GET /api/nope` yields `text/html`. The API client must not assume a JSON body on failure.

**L13 — No roles, no ownership.** Any authenticated user can create, edit, or delete any student;
courses, events and announcements are still writable with no token at all (registrations no longer are). The UI reflects this honestly
rather than inventing permission states the backend does not enforce.

**L14 — `authMiddleware` doesn't check the `Bearer` scheme.** It splits the header on a space and takes
index 1, so `Authorization: NotBearer <valid-jwt>` authenticates. Missing header → 401 "Access denied.";
unparseable → 401 "Invalid or expired token".

**L15 — No token refresh.** JWTs expire in 1 hour with no refresh route, so a 401 mid-session is
unrecoverable — the frontend clears state and sends the user to login with an explanatory message.

---

# Planned frontend pages (each tied to confirmed endpoints)

| Page | Endpoints it actually calls |
|---|---|
| **Login** | `POST /api/auth/login` |
| **Signup** | `POST /api/auth/signup` → `POST /api/auth/login` |
| **Dashboard** | `GET /api/profile`, `GET /api/students?limit=…`, `GET /api/courses`, `GET /api/events`, `GET /api/announcements`, `GET /api/registrations/me` — real counts only |
| **Students list** | `GET /api/students` with `search`, `sort`, `page`, `limit`, `course` |
| **Student detail** | `GET /api/students/:id` (+ `DELETE /api/students/:id`) |
| **Student create/edit** | `POST /api/students`, `PUT /api/students/:id`, `GET /api/courses` (dropdown) |
| **Courses** | `GET /api/courses`, `POST /api/courses` |
| **Events** | `GET /api/events`, `POST /api/events`, `GET /api/registrations/me` (Registered badges on load), `POST /api/registrations` (register button; 201 = registered, 409 = already registered) |
| **Announcements** | `GET /api/announcements`, `POST /api/announcements` |
| **Profile** | `GET /api/profile` — **read-only**, no update endpoint exists |

**Deliberately NOT built** (no backend support): course/event/announcement detail routes, edit or
delete for courses/events/announcements, cancel-registration, and profile editing.

Registration now requires a logged-in user, so the **Events page's register action is gated behind auth**
like the students pages are.

---

# Backend fix commits (isolated from all frontend work)

| Commit | Scope |
|---|---|
| `9220d208` | Baseline — commits the backend exactly as found, no behavior change, so the two fixes below read as clean diffs |
| `75c87c9d` | **L1** — `backend/index.js`, 4 insertions / 1 deletion |
| `d83a0a67` | **L6** — `backend/routes/registrationRoutes.js` + `backend/controllers/registrationController.js`, 37 insertions / 5 deletions |
| `2e67c63c` | **L2** — `backend/dtos/studentDto.js`, 19 insertions / 3 deletions |
| `777afb7d` | **L6a + L6b** — `backend/controllers/registrationController.js` + `backend/models/registrationModel.js`, 34 insertions / 5 deletions |
| `e417fae9` | **`GET /api/registrations/me`** (authorized addition) — `backend/controllers/registrationController.js` + `backend/routes/registrationRoutes.js` |
| `3e22db8e` | **C1** — environment-conditional rate limits — `backend/index.js` + `backend/.env.example` |

Branch: `campushub-frontend`. No other backend file was modified.
