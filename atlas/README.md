# Atlas — concept mapping

VUE-inspired concept mapping with standalone email/password accounts, email verification, owner approval, and AI suggestions. No ChatGPT account is needed. Owner: `bluehat2468@gmail.com` (server configuration, never a browser-side permission check).

## Temporary no-sign-in testing

Sign-in is temporarily disabled in config.js (REQUIRE_SIGN_IN=false). GitHub Pages now opens the complete mapping workspace immediately, without an account, Gmail setup, or backend. Test maps save in this browser under a separate storage key. Use JSON export to keep backups or move maps to another device. Existing account maps remain protected on the backend.

For real AI locally, supply OPENAI_API_KEY in the ignored .env file, then run:

```sh
node --env-file-if-exists=.env server/test-mode.js
```

Open http://localhost:4317. This test server binds only to 127.0.0.1, uses an in-memory database for rate limits, and enables only the AI endpoint without sign-in. Account, admin, and account-storage endpoints remain protected. Do not expose this local server through a tunnel. GitHub Pages cannot itself execute AI calls; it displays an explanatory message when no backend is configured.

To restore account protection, set REQUIRE_SIGN_IN=true and use the normal server/start.js with the hosting settings below.

## Account flow (when sign-in is restored)

1. Register with name, email, and a 12–128 character password.
2. Confirm the emailed verification link (expires after 24 hours; one use).
3. Wait for the owner's approval. Unverified and pending users cannot read/write maps or call AI.
4. The owner signs in, opens **Account approvals**, and approves, rejects, or revokes access. Approval decisions send notification emails. If delivery fails, the UI reports it and the access decision still applies.

The configured owner email becomes the owner only after proving control of that mailbox. No “first person to register becomes admin” behavior. The owner registers normally and verifies their email; no separate approval is needed for that owner account. If that address has already been registered, reset its password by email. Changing ADMIN_EMAIL later does not transfer or remove existing administrator privileges; handle ownership changes as a database migration.

## Hosting status and prerequisites

**GitHub Pages can host the frontend, but cannot run this backend.** The account-based version requires a configured backend; temporary browser-local testing does not. Uploading this folder does not activate email delivery or host the server. The older ChatGPT Sites deployment is separate and still uses its existing owner-private access.

You need:

- Node.js 24 LTS backend host with HTTPS and persistent disk (one server process).
- Gmail SMTP credentials for `bluehat2468@gmail.com`. Enable Google 2-Step Verification, then create a dedicated **App Password**. Some account policies do not allow App Passwords. Do not use the normal Google password.
- The existing OpenAI key supplied privately as `OPENAI_API_KEY` on the backend. No keys are included in this repository.

### Run on a server

```sh
cd atlas
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
# Edit .env privately; never commit it.
pnpm start
```

Use the pnpm version in `packageManager`. The application has no frontend build step. Put a trusted HTTPS reverse proxy in front of the Node listener; it should enforce request size/rate limits and overwrite forwarded IP headers. Set `TRUST_PROXY=true` only when the listener is reachable exclusively through that proxy. Without it, rate limits use the socket address.

Configure `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER=bluehat2468@gmail.com`, and the secret `SMTP_PASSWORD`. `SMTP_FROM` defaults to the SMTP user. Gmail delivery and sending limits remain subject to Google account policy. Missing or failed SMTP never grants access. Users can retry through **Resend verification**.

### Temporary GitHub Pages frontend

1. Host this backend at your chosen HTTPS origin. Set `PUBLIC_URL` to that origin.
2. Set `FRONTEND_URL=https://bluehattom.github.io/Apps/atlas/` so verification/reset emails return to the Pages frontend.
3. Set `API_BASE` in **config.js** to the backend's HTTPS origin (no path or trailing slash). This is public configuration, not a secret.
4. Set `COOKIE_SAMESITE=None` on the HTTPS backend for cross-site Pages hosting. Only the exact configured frontend/backend origins are allowed.
5. Access the folder through the repository's existing Pages publication. This change does not replace the App Hub or its deployment settings.

**Browser constraint:** Pages on `github.io` and an unrelated backend use third-party cookies, which some browsers block. For reliable sessions, use frontend/backend subdomains of the same custom domain, or serve the entire app from the backend host. Do not solve this by storing session tokens in browser localStorage or weakening the approval checks.

### Move to private hosting

Serve the frontend and backend together: set `API_BASE=''` in config.js, set both URLs to your new HTTPS site, and set `COOKIE_SAMESITE=Lax`. Stop the old server, back up and move the entire persistent data directory including SQLite WAL files, and start the new host with the same owner/mail/OpenAI settings. Do not run two independent writable copies. Users sign in again at the new domain. Issue fresh verification/reset links after the move because old links point at the old frontend.

## Storage and security

- Passwords use salted scrypt hashes. Random session and email tokens are stored only as SHA-256 hashes; sessions use Secure/HttpOnly cookies in production and expire after 12 hours.
- All workspace/AI routes enforce verified + approved status on every request. Admin routes additionally enforce the server-side admin role. Rejection/revocation deletes existing sessions; password reset also revokes sessions without changing approval.
- Mutations require an allowed Origin, JSON, and (for authenticated routes) a session-bound CSRF token. Auth/email/AI endpoints are rate-limited in SQLite across restarts.
- Each user's maps are stored under their server-side account ID. A revision check prevents stale tabs overwriting newer edits. If saving fails, export your map before reloading. Nothing is stored in shared browser localStorage.
- Existing browser-only maps from the old Sites version are **not** silently migrated or shared. Export JSON there and import it after signing into the new account.
- Static JS/HTML source is public on GitHub Pages; account data, approval decisions, passwords, and API access are enforced by the backend. Repository visibility does not protect runtime data.
- `data/`, `.env*`, SQLite files, and node_modules are excluded from Git and Docker build contexts. Back up the database to private storage. Never upload live databases or secrets to GitHub Pages.
- This release targets small, single-server use. Multiple backend replicas require shared storage and shared rate limiting. Review quotas and deployment monitoring before a wider launch.

## Validation

```sh
node --test tests/*.test.js
```

Tests exercise registration/verification/approval ordering, token expiry/reuse, password reset, session revocation, CSRF/origin rejection, owner-only approval, per-user map isolation, stale writes, mail failures, and rate limits. Email delivery is mocked in tests; real Gmail SMTP and the chosen production host must be verified after secrets and hosting are configured.

References: [GitHub Pages hosting](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [Google App Passwords](https://support.google.com/accounts/answer/185833), [Nodemailer SMTP](https://nodemailer.com/smtp).
