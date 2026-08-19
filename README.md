# TheDays API

Node.js, Express, TypeScript, Prisma, and PostgreSQL backend for TheDays.

## Requirements

- Node.js 22+
- PostgreSQL 17+ (or Docker)

## Local setup

1. Copy `.env.example` to `.env`. Replace `SESSION_SECRET` with a random value of at least 32 characters. Set `EMAIL_USER` to a Gmail address and `EMAIL_APP_PASSWORD` to a Google App Password.
2. Start PostgreSQL with `docker compose up -d postgres`, or point `DATABASE_URL` at an existing PostgreSQL database.
3. Install dependencies with `npm install`.
4. Apply migrations with `npm run prisma:migrate`.
5. Start the API with `npm run dev`.

The health endpoint is `GET /api/health`.

## Authentication API

Verify-email and login set an opaque `thedays_session` HttpOnly cookie. Browser requests must include credentials.

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create an unverified account and email a 6-digit code |
| `POST` | `/api/auth/verify-email` | Confirm the code, mark the email verified, and create a session |
| `POST` | `/api/auth/resend-verification` | Email a new verification code |
| `POST` | `/api/auth/login` | Create a session for a verified account |
| `POST` | `/api/auth/logout` | Revoke the current session and clear its cookie |
| `GET` | `/api/auth/me` | Return the current authenticated user |

Registration accepts `username`, `email`, `password`, and an optional IANA `timezone` (defaults to `UTC`). Usernames must be 3–30 characters, start with a letter, and contain only lowercase letters, numbers, and underscores. Register does not set a session cookie. Login accepts `email` and `password` and requires a verified email. In `NODE_ENV=test`, verification emails are not sent.

The default cookie policy is `SameSite=Lax`. If the frontend and API use unrelated sites, set `COOKIE_SAME_SITE=none` in production and serve both over HTTPS. Unsafe browser requests are also restricted to `FRONTEND_URL`.

The included authentication rate limiter uses process memory, which is suitable for one API instance. Replace its store with a shared backend before running multiple instances.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server with reload |
| `npm run build` | Compile production JavaScript |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Type-check without emitting |
| `npm test` | Run tests once |
| `npm run prisma:generate` | Regenerate the Prisma client |
| `npm run prisma:migrate` | Create/apply a development migration |
| `npm run prisma:deploy` | Apply committed migrations in deployment |
