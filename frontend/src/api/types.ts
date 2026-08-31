/**
 * Types transcribed from the backend source and verified against live responses.
 * See FRONTEND_API_MAP.md at the repo root. Do not "improve" these shapes —
 * they describe what the API actually returns, quirks included.
 */

/** `GET /api/profile`, and the `user` object inside login/signup responses. */
export interface User {
  id: string;
  name: string;
  email: string;
}

/**
 * What `studentDto` exposes on reads, including the populated course (fix L2).
 *
 * `course` is null when the reference cannot be resolved — most seeded students
 * store a legacy course *name* string rather than an ObjectId (see D1), so the
 * UI must handle a missing course rather than assume one.
 */
export interface Student {
  id: string;
  name: string;
  course: StudentCourse | null;
}

/** The course as embedded in a student read. Mirrors Course minus `__v`. */
export interface StudentCourse {
  id: string;
  name: string;
  duration: number;
}

/**
 * Raw Mongoose doc returned by student create/update — the only place the API
 * reveals a student's course, and only as an unpopulated ObjectId string.
 */
export interface StudentDoc {
  _id: string;
  name: string;
  course: string;
  __v?: number;
}

/** Raw doc. The live schema is `models/courseModel.js` = { name, duration }. */
export interface Course {
  _id: string;
  name: string;
  duration: number;
  __v?: number;
}

/** Raw doc. `date` is an ISO-8601 UTC string; render it in UTC (see L: date handling). */
export interface CampusEvent {
  _id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  __v?: number;
}

/** Raw doc. `date` defaults to the server's now. */
export interface Announcement {
  _id: string;
  title: string;
  message: string;
  date: string;
  __v?: number;
}

/** Raw doc returned by `POST /api/registrations`; ids are unpopulated. */
export interface Registration {
  _id: string;
  user: string;
  event: string;
  __v?: number;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

export interface SignupResponse {
  message: string;
  user: User;
}

/** Query params accepted by `GET /api/students`. */
export interface StudentQuery {
  name?: string;
  course?: string;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
}
