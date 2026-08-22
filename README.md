# TheDays API

Node.js, Express, TypeScript, Prisma, and PostgreSQL backend for TheDays.

## Requirements

- Node.js 22+
- PostgreSQL 17+ (or Docker)

## Local setup

1. Copy `.env.example` to `.env`. Replace `SESSION_SECRET` with a random value of at least 32 characters. Configure a Brevo API key and verified sender with `BREVO_API_KEY`, `EMAIL_FROM_ADDRESS`, and `EMAIL_FROM_NAME`. Set `GOOGLE_CLIENT_ID` to a Google Cloud OAuth 2.0 Web client ID.
2. Start PostgreSQL with `docker compose up -d postgres`, or point `DATABASE_URL` and `DIRECT_DATABASE_URL` at an existing PostgreSQL database. The two URLs can be identical for local PostgreSQL.
3. Install dependencies with `npm install`.
4. Apply migrations with `npm run prisma:migrate`.
5. Start the API with `npm run dev`.

The health endpoint is `GET /api/health`.

## Authentication API

Verify-email, login, and Google sign-in set an opaque `thedays_session` HttpOnly cookie. Browser requests must include credentials.

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create an unverified account and email a 6-digit code |
| `POST` | `/api/auth/verify-email` | Confirm the code, mark the email verified, and create a session |
| `POST` | `/api/auth/resend-verification` | Email a new verification code; eligible delivery failures return `503 EMAIL_DELIVERY_FAILED` |
| `POST` | `/api/auth/login` | Create a session for a verified account |
| `POST` | `/api/auth/google` | Verify a Google ID token, create or link the account, and create a session |
| `POST` | `/api/auth/logout` | Revoke the current session and clear its cookie |
| `GET` | `/api/auth/me` | Return the current authenticated user |

Registration accepts `username`, `email`, `password`, and an optional IANA `timezone` (defaults to `UTC`). Usernames must be 3–30 characters, start with a letter, and contain only lowercase letters, numbers, and underscores. Register does not set a session cookie. Login accepts `email` and `password` and requires a verified email. Google sign-in accepts a GIS `idToken` and an optional IANA `timezone`, verifies the token against `GOOGLE_CLIENT_ID`, and sets a session cookie. First-time Google users get an auto-generated username and no password; an existing account with the same email is linked. Password login on a Google-only account returns `USE_GOOGLE_SIGN_IN`.

Verification email is sent through Brevo's transactional-email HTTPS API. A successful registration response, or `204` from an eligible resend, means Brevo accepted the request and returned a message ID; it does not guarantee delivery by the recipient's inbox provider. Resends for nonexistent accounts, verified accounts, and requests inside the cooldown window also return `204` to avoid account disclosure. Eligible Brevo failures return `503 EMAIL_DELIVERY_FAILED` and do not start the resend cooldown.

The default cookie policy is `SameSite=Lax`. If the frontend and API use unrelated sites, set `COOKIE_SAME_SITE=none` in production and serve both over HTTPS. Unsafe browser requests are also restricted to `FRONTEND_URL`.

The included authentication rate limiter uses process memory, which is suitable for one API instance. Replace its store with a shared backend before running multiple instances.

## Render, Neon, and Brevo deployment

1. Create an empty Neon project in a region close to the Render service. Existing production users are intentionally not migrated.
2. In Render, set `DATABASE_URL` to Neon's pooled connection URL and `DIRECT_DATABASE_URL` to its direct connection URL. The running Prisma adapter uses the pooled URL; Prisma migration commands use the direct URL.
3. Verify the sender address in Brevo, create a transactional-email API key, and store it only in Render's secret environment variables as `BREVO_API_KEY`. Set `EMAIL_FROM_ADDRESS` to that verified sender and `EMAIL_FROM_NAME` to the display name.
4. Set `TRUST_PROXY=true` so Express and the authentication rate limiter use Render's forwarded client IP. Configure the remaining values from `.env.example`, including the production frontend URL, cookie policy, Google client ID, and a strong session secret.
5. Use `npm run prisma:deploy` as the pre-deploy migration command, `npm run build` as the build command, and `npm start` as the start command. Apply the committed migrations to the empty Neon database before directing production traffic to it.
6. Keep the previous database untouched until registration, email verification, password login, Google sign-in (if enabled), and an API restart have all passed smoke testing against controlled accounts.

Brevo sender verification is distinct from domain authentication. A Gmail sender can be verified but its domain cannot be authenticated through Brevo, so reduced deliverability and sender trust are accepted MVP risks. The application does not retry failed OTP sends automatically; the user can retry immediately after a provider failure.

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
