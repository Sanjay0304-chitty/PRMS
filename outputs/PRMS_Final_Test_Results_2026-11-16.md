> Baseline report. Corrections and retest results are in [Security fix verification](PRMS_Security_Fix_Verification_2026-11-16.md).

# PRMS final regression and security review

Test date: 16 November 2026, Malaysia time

## Decision

The tested rental workflows pass, but security acceptance is **not yet approved**. A Google account-linking flaw was reproduced in an isolated controller test. Correct it before public hosting. The privacy notice also needs factual corrections. UAT remains pending.

This report tests the current local working tree, based on commit ba3086f6ddf3e0dc293197b0e74004b2567090da plus uncommitted changes. It is not a report for GitHub main alone. No application source changes, commits or pushes were made during this review.

## Results

| Check | Result | Evidence |
|---|---|---|
| Backend automated tests | 297/297 passed, 34 suites | Jest JSON results |
| Frontend API and file-handling tests | 11/11 passed | Node test runner |
| Frontend ESLint | Passed | npm run lint |
| Backend production build | Passed | TypeScript compiler |
| Frontend production build | Passed with bundle-size warning | Vite build; largest main bundle approximately 1.07 MB before gzip |
| Live rental workflow | 62/62 API requests met expected results | Temporary MySQL copy and production-mode backend |
| Additional live assertions | 70/71 passed | Account-existence disclosure failed the privacy expectation |
| Google identity-binding negative test | Failed | Mocked verified attacker UID was linked to a different email; handler returned victim Admin identity |
| Frontend production dependency audit | No reported vulnerabilities | npm audit --omit=dev |
| Backend production dependency audit | Six moderate affected packages; no high or critical advisories reported | Two underlying advisory families, with transitive affected packages |
| User acceptance testing | Pending | Await lecturer/client feedback |
| Real password recovery and Google sign-in | User-confirmed working | External email delivery and real Google popup not repeated in this run |

Counts are separate evidence groups, not a combined percentage of the whole system. The Google controller reproduction uses mocked identity verification and in-memory users; it is not a real Firebase account takeover attempt.

## Functional scope exercised live

1. All four roles signed in using email/password and loaded their profile, preferences, shared categories, messages, notifications, personal-data overview and own privacy requests. Landlord and Agent personal category endpoints also responded successfully.
2. Landlord created a temporary listing with long descriptions, amenities and image upload. Public search found it with mixed-case criteria. Tenant property editing was denied.
3. Agent editing was denied before assignment, allowed for listing content after assignment, and rejected for rent changes. Listing updates produced an audit event.
4. Tenant requested a viewing; Agent accepted; Tenant confirmed; Landlord completed a past appointment. Tenant archived it and retrieved the archive.
5. Tenant applied; Agent recommended; Landlord approved; Agent generated an agreement; Tenant completed the simulated agreement OTP; Landlord signed; Agent completed move-in.
6. Tenant raised maintenance. Assigned Agent accessed it, progressed and resolved it. Landlord archived it. After unassignment, Agent access was denied and Landlord access remained available.
7. Agent marking a payment paid was denied. Tenant completed a mock checkout; database status became PAID. Landlord and Agent notification lists contained payment-received notifications. Tenant dismissed payment activity and loaded the payment dashboard.
8. Tenant sent a message to the connected Agent, who opened the conversation and marked the message read.
9. Tenant submitted an access request; Admin could list requests. Tenant could not list all users' requests. Listing-report submission and Admin audit filtering succeeded. All four roles could access their own selected stored data.
10. Property removal followed the existing deactivation behaviour and set the test listing INACTIVE.

The viewing no-show branch, every agreement revision branch and every UI interaction were not individually repeated live. Automated tests provide additional coverage but do not substitute for those manual scenarios.

## Security findings

### SEC01 High priority Google identity binding

Location: prms-backend/src/modules/auth/controller_auth.ts, googleLogin; modules/auth/firebase_auth.ts.

The Firebase helper returns only the verified UID. When that UID has no existing match, the controller finds an account using the email from the request body and links it if the existing UID is a local placeholder. It does not compare that email with the verified token email or require verified email ownership.

Reproduction: the verifier was mocked to return an attacker UID, while the request supplied a different copied user's email. The copied victim had a local placeholder UID. The handler returned HTTP 200 with the victim's Admin role. No real account or Firebase credential was changed. Existing genuinely linked Firebase accounts have an additional UID mismatch check; the observed exposure concerns eligible unlinked/local accounts.

Required correction: derive UID and email from the decoded verified token, require appropriate email verification, and reject conflicting browser-supplied identity fields. Retest with two different verified identities, inactive accounts and unlinked password accounts. Google sign-in can work normally while this negative security case still fails.

The configuration also permits a Google-login path without token verification when ENABLE_FIREBASE_VERIFY is false. The current tested configuration rejected missing tokens, but production must fail closed rather than allow an email-only fallback.

### SEC02 Medium priority account enumeration

POST /api/auth/check-email revealed exists=true for a registered account without authentication. The controller also returns account active status. This is confirmed by a live negative test. Authentication rate limiting reduces request volume but does not hide the information.

Review whether the pre-login account lookup is necessary. Prefer generic responses and avoid publicly revealing active/inactive state. Recheck the login and signup experience after changing it.

### SEC03 Moderate dependency advisories

The backend audit reports affected packages gaxios, gcp-metadata, glob, google-gax, minimatch and rimraf. These are not six independently demonstrated remote exploits. The underlying advisories concern glob cancellation and minimatch resource amplification; assess reachability and update compatible dependency versions in a separate change, then repeat tests.

Advisory references:
- https://github.com/advisories/GHSA-3g3m-2fjr-6pw4
- https://github.com/advisories/GHSA-g3hv-75wg-m249

### Additional hardening observations from code review

- Browser session tokens are held in localStorage or sessionStorage, so injected script could read them. Consider HttpOnly, Secure cookies with appropriate CSRF controls when planning production authentication.
- Logout clears the refresh token, but existing JWT access tokens remain usable until expiry. Changing a password does not clear the stored refresh token in changePassword. Decide and test the intended session-revocation policy.
- Unexpected error messages may be returned verbatim, including the database failure message in /health. Use generic production responses and retain details only in protected server logs.
- Avatar upload filtering relies on claimed MIME type and filename extension without decoding/re-encoding in that upload path. Validate actual image content and remove debug logging before public release.
- Agreement OTP is explicitly simulated and returned to the caller. Treat it as demonstration signing, not independently verified signing. Password recovery has a separate hashed, expiring, single-use code/grant implementation tested by automated tests.

These observations were not all separately exploited live and should not be presented as confirmed remote compromises.

## Security controls that passed the checks

- Anonymous requests to users, maintenance, payments, communication, personal data and audit logs were rejected.
- Landlord, Tenant and Agent were denied tested Admin user, privacy, retention and audit routes.
- Invalid bearer tokens were rejected; public Admin registration and password reset without a reset grant were rejected.
- Own-profile responses did not contain passwordHash.
- Protected file test paths did not serve an anonymous download. These synthetic paths alone do not establish every existing attachment's permission; automated file-access tests provide additional coverage.
- SQL-like search input did not produce a server failure. This single probe is not proof that every input is injection-safe.
- CSP, nosniff, HSTS and frame-protection headers were present on the production-mode origin. An untrusted origin did not receive CORS permission. Presence of headers does not establish final hosted TLS configuration or browser compatibility.
- Permanent retention execution remained disabled. Its endpoint returned HTTP 500, so a clearer deliberate disabled response would be preferable; no cleanup was executed.

## Privacy review

Implemented controls include a bilingual privacy notice, recorded consent, own-data overview, own privacy requests, Admin-reviewed request handling and role restrictions. Automated privacy tests passed. The overview contains selected information and is not a full automatic export of everything held about a person.

The notice in prms-frontend/src/config/legalContent.js currently states Singapore/Malaysia cloud hosting, AES-256 storage encryption, TLS 1.3, contractual cross-border safeguards and a named DPO with office address and email contacts. Those statements are not substantiated by this local-PC demo and undecided hosting plan. Confirm the named person and monitored contact details; replace sample details if they are placeholders. Correct both English and Bahasa Malaysia consistently.

The notice also implies operational disposal/anonymisation under Admin governance; the Bahasa Malaysia text describes periodic processing. Retention execution is disabled. Keep retention unchanged as requested, but make the notice accurately describe preview-only retention and manual review. Do not imply scheduled deletion is operating.

Account deletion currently anonymises basic profile fields and deactivates the account while retaining related records and files. The workflow includes eligibility checks and fulfillment notes. Explain that scope clearly; it is not complete erasure of all personal data.

Hosting location, processors such as Firebase/email providers, backup retention, actual encryption and a reachable privacy contact must be confirmed before a real-data rollout. This technical review does not certify PDPA compliance. Malaysia's regulator describes notice/choice, security, retention and access as core principles, and explains that the notice should describe actual personal-data processing:
- https://www.pdp.gov.my/en/principles-of-personal-data-protection/
- https://www.pdp.gov.my/en/akta/guidance-on-the-preparation-of-personal-data-protection-notices/

## Test isolation and limitations

Live tests used a temporary prms_qa_20261116 MySQL copy on loopback port 3520 with NODE_ENV=production. Existing listings, accounts and tenancies were not changed. Tests created their own records in the copy. The test backend was stopped and the copied database removed. No public tunnel was opened. The existing local database service was left running.

No fresh Chrome visual walkthrough, complete phone/browser matrix, accessibility audit, load test, full penetration test, backup restoration or final-host TLS/storage check was performed. User-confirmed external email/Google functionality is recorded separately. Hosting remains pending the decision planned for Wednesday 18 November 2026. No hosting changes were made.

## Completion checklist

1. Fix SEC01 and add identity-mismatch regression tests before public hosting.
2. Correct factual privacy-notice claims and confirm a monitored privacy contact.
3. Review account enumeration and the compatible dependency security updates.
4. Complete the remaining browser/manual scenarios and collect UAT feedback.
5. After hosting is selected, verify HTTPS, allowed origins, Firebase domain, database access, persistent uploads and backup restoration on that environment.
6. Repeat the affected tests after each correction. Retention stays as implemented and no permanent disposal is enabled.
