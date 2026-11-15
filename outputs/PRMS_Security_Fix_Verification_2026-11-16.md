# PRMS security corrections and verification

Date: 16 November 2026, Malaysia time

## Outcome

The identified Google identity-binding flaw and public email-check disclosure have been corrected in the local code. Automated tests and the isolated live workflow regression pass. The backend production dependency audit reports zero known vulnerabilities. Privacy notice version 2.1 now describes the actual demonstration setup in English and Bahasa Malaysia.

Final external Google sign-in still needs a user check: Chrome reached Google's account chooser, but browser automation could not complete account selection. It subsequently stopped because it could not reliably identify the active Windows browser URL. This is not recorded as a successful Google authentication. UAT and hosting acceptance remain pending.

## Verification results

| Area | Result |
|---|---|
| Backend Jest tests | 316/316 passed in 37 suites |
| Frontend tests | 11/11 passed |
| Frontend lint | Passed |
| Backend and frontend production builds | Passed |
| Rental workflow API regression | 62/62 expected responses passed |
| Additional live API/security assertions | 71/71 passed |
| Backend production dependency audit | 0 reported vulnerabilities |
| Frontend production audit | Previously verified clean on this date; frontend dependencies were not changed in this task |
| Whole backend dependency tree including development tools | 21 reported advisories: 4 low and 17 moderate |
| Patched dependency compatibility | rimraf async and sync glob smoke checks passed on disposable test files |
| Git whitespace check | Passed; normal Windows line-ending warnings only |

Counts are separate test groups. The additional API group excludes the duplicated workflow-summary assertion. The detailed CSV includes backend automated assertions and live API results; frontend and browser results are summarised here.

## Corrections made

### Google identity and account linking

- The backend verifies the Firebase ID token and requires a verified email and Google provider.
- It uses the UID and email from the verified token, rather than selecting an account from an untrusted browser email.
- Conflicting supplied email, invalid token, missing token, inactive account, an already-linked different identity and a concurrent linking change are rejected.
- Linking uses a conditional database update so a competing request cannot silently overwrite an identity.
- The email-only fallback has been removed even when verification is disabled.
- The Firebase verifier uses a named app and explicit project ID, with optional service-account credentials. ID-token verification uses Google's public signing certificates. The SDK supports an explicit projectId for token verification: https://firebase.google.com/docs/auth/admin/verify-id-tokens

During this task, the private local environment was found to have verification disabled and no service-account key. Earlier successful Google sign-in was therefore not evidence of secure backend verification. The local verification flag is now enabled using the existing project ID, and the previous private environment was backed up under the ignored artifacts directory. No credentials were printed or committed.

New tests reproduce a verified attacker submitting another user's email and confirm rejection before account lookup or token issuance. Positive tests cover legitimate existing-identity login and safe local-account linking. SDK claim tests cover normalization, unverified or missing email and non-Google providers. These tests mock Firebase token verification; they do not replace the final external Google login check.

### Account lookup and login privacy

- The email-check endpoint gives the same generic response for valid email input without querying account existence or status.
- The login page validates email syntax locally and submits credentials directly.
- Unknown accounts, inactive accounts, Google-only accounts and incorrect passwords receive the same failed-login message. A password comparison is performed in each case.
- Valid email/password logins for all four roles passed live checks after the changes.

This closes the tested pre-login lookup and failed-login disclosures. It is not a claim that every possible account-enumeration side channel in signup or other endpoints has been eliminated.

### Privacy wording

Both languages now accurately describe local MySQL and uploaded files, optional Cloudflare access, Firebase/Google and email providers, publicly accessible listing images/avatars, selected-data access and Admin-reviewed requests. Unsupported cloud-location, encryption, contractual safeguard, named DPO and office-address claims were removed. The notice explains simulated payments and agreement verification codes and asks testers to use sample information.

The notice describes account closure as basic-profile anonymisation and deactivation with related records/files retained. A production privacy contact is still to be confirmed; no new contact person or address was invented. The notice version changed from 2.0 to 2.1, preserving historical consent versions rather than rewriting recorded consents.

### Dependency patches

Updated transitive packages and added targeted overrides for glob/minimatch in the affected dependency chain. Installed production versions include glob 14.0.6 and minimatch 11.0.8. These cross transitive major versions, so their used async/sync glob APIs were smoke-tested, followed by the backend test suite and build. No direct Firebase major upgrade or forced audit upgrade was applied. Development-only advisories remain; zero production audit findings is not proof of absence of all vulnerabilities.

## Browser checks

Chrome verified all four email/password role dashboards. Admin retention showed preview-only wording and no permanent-cleanup action. Landlord property cards loaded. Tenant dashboard figures and payment/maintenance empty states loaded. Agent dashboard showed its assigned property and related records.

The English privacy notice and Bahasa Malaysia switch were checked live. Narrow-screen privacy and login layouts were visually inspected; the measured page width equalled the viewport width on the privacy page, with no page-level horizontal overflow. The viewport override was reset afterward. This was a limited responsive check, not a full device/browser matrix.

Google opened the existing account chooser for the configured Firebase project. Account selection could not be completed through automation, so successful verified Google login is pending a manual check. A Tenant logout/navigation attempt was inconclusive when browser clicks stopped taking effect; Agent logout and other role sign-ins worked. Browser-tool interruption must not be treated as a confirmed product failure or a passed interaction.

An additional existing UI limitation was observed: the Landlord dashboard still displays Sprint 6 placeholder revenue/export text. The separate finance/payment workflow passed API regression. Dashboard placeholder cleanup was not included in these security corrections.

## Preserved behaviour and cleanup

Retention services, policy values and execution behaviour were not changed in this task. Permanent cleanup remains disabled. Password recovery was not modified and its automated tests pass; real email delivery remains user-confirmed rather than re-sent during this task.

Live workflow tests ran against a temporary MySQL copy on loopback port 3520. Existing listings, tenancies and account links in the main database were preserved. The temporary server, copied database and its access grants were removed after testing. No public tunnel was opened, and no hosting changes were made. Existing application servers and the local MySQL service were left as they were. No commit or push was made.

## Remaining checks before final acceptance

1. Restart the ordinary backend so it loads the new code and verification setting, then complete one Google sign-in with an already registered real account. Check the final authorised website domain again once hosting is chosen.
2. Collect lecturer/client UAT feedback and address any blocking issues.
3. Confirm a monitored privacy contact and the final hosting/storage/backup arrangements before using real personal data.
4. Review the development-tool advisories and the existing Landlord dashboard placeholders separately.
5. Complete broader browser/device checks, backup restoration and final deployment HTTPS/CORS/persistence tests. Existing session-revocation, generic production-error and avatar-content-validation observations in the baseline report remain separate hardening work.

This report verifies the specified corrections, not full penetration-test coverage or PDPA certification. The earlier final-test report is retained as the baseline; its original findings should be read alongside this correction report.
