# Integration of 026db60 and security corrections

The 31 October 2026 update retains the incoming tenant payment filters/receipts, finance summaries, listing reports, category controls, admin interfaces and privacy-page changes. Existing local API compatibility, user-summary refresh, property-review migration and gallery fixes are preserved.

## Corrections

- Password recovery emails a cryptographically generated code using SMTP. Codes are hashed in memory, expire after five minutes, and are invalidated after five incorrect guesses. Verification issues a random, email-bound, single-use reset grant; an account-wide verified flag can no longer authorise another caller. Successful reset clears the stored refresh token. Codes are not returned to the browser, stored in notifications or written to logs. Existing access tokens expire according to their configured lifetime.
- Protected downloads use authenticated API requests and temporary blob URLs. Bearer tokens are not placed in URLs or sent to external hosts. Agreements use the configured API origin rather than hard-coded localhost. File thumbnails require owner/admin access. Maintenance photos use ticket ownership and property authority, including assigned Agents.
- File lookups match complete stored paths rather than filename substrings. Untracked image filenames do not automatically become public. Property-document access for Tenants requires a confirmed/current booking.
- Property image deletion requires a caller identity and property authority. The property detail gallery remains read-only, documents are excluded from image thumbnails, and properties without reviews do not show fabricated review entries.
- CORS honours the configured origin allowlist. Header contrast and the existing ESLint policy are preserved; new syntax/unused-code issues are corrected.
- Permanent retention cleanup is disabled in both the API and interface pending a reviewed disposal policy. Preview remains available. This integration did not execute deletion, anonymisation, seeding or migrations against the real database.
- Compatible dependency security patches were applied. The email library uses the patched 10.3.1 release, and the frontend overrides a vulnerable Firebase transitive gRPC dependency with 1.14.7. Firebase remains on the existing major version. Runtime-only npm audits returned zero reported vulnerabilities for both projects at verification time. Development-tool advisories remain and have not been resolved by forcing breaking downgrades.

## Email setup

Use the variables documented in `prms-backend/.env.example`. Add real SMTP_HOST, SMTP_PORT, SMTP_FROM and, where required, SMTP_USER/SMTP_PASSWORD to the private backend `.env`. Use TLS for production. Restart the backend after configuration. Never place the completed `.env` in Git or share SMTP passwords in chat.

Without SMTP configuration, ordinary login continues to work; recovery explains that email delivery is unavailable. A local simulated SMTP mailbox was used for end-to-end verification; delivery through a real email provider was not tested. The recovery store is in memory: restarting the backend invalidates pending codes/grants. Multiple production instances require a shared, expiring store.

## Validation

- Frontend lint and production build; backend TypeScript/build.
- 221 backend unit tests, including recovery misuse and cross-role attachment access.
- Seven frontend API/file-handling tests.
- 51 live API checks against an isolated database copy, including seven dummy-account logins, four-role authorised file access, unrelated-user denials, anonymous denials, CORS, image deletion denial, disabled cleanup, and password recovery through a simulated SMTP mailbox.
- Chrome checks: Admin login, dashboard/user totals and disabled retention control; Landlord dashboard/property/maintenance photo opening; Agent assigned properties and listing editor; Tenant dashboard and payment filters.

These checks cover the affected integration paths, not every operation in the system. The optional Valerie/Cloudflare hosting launcher and real Google sign-in were not exercised. This is not a penetration-test certificate or a declaration of full PDPA compliance.

## Running locally

Run `npm run dev` in each project folder as before. No database reset or seed is required for this update. The existing local database and private environment files are preserved. Stop and restart any pre-existing development servers so they load the updated code.

The optional `npm run host` command from the incoming update can expose the application externally; it was not invoked during integration.
