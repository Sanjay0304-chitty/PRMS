# Google first sign in role selection results

Implemented on 16 November 2026.

New Google users now select Tenant, Landlord or Agent and acknowledge the privacy notice before their PRMS account is created. They do not need to register an email/password account first. Returning Google users retain their existing role. Admin is excluded from self-service registration.

Verification completed:

- 336 backend tests passed across 39 suites.
- 11 frontend tests passed; frontend lint and both production builds passed.
- 25 additional onboarding assertions passed through the live signup endpoint in a disposable MySQL copy. These covered the three roles, recorded acknowledgement, Agent profile creation, Admin rejection, missing acknowledgement, replay protection and denial of protected API access with a registration-only grant.
- The existing 62-request rental workflow and 71 other live assertions also passed. Separate simulated clients were used for the three signup scenarios to keep the production authentication rate limit enabled without combining all attempts into one client budget.
- Unit tests also cover forged and expired grants, verified-identity mismatch, existing account collision and disabled Google configuration.

The live signup endpoint tests used grants issued by the real server-side registration helper with test identities. They did not execute a fresh external Google popup or complete the browser account-creation form. Those remain a manual end-to-end confirmation, not a claimed live Google-provider pass.

Existing main-database users, roles and listings were preserved. The temporary QA database, access grants and test server were removed. No schema migration, reseed, commit or push was performed. Retention was unchanged.

Manual check: with an unregistered Google account, click Google, choose a role, acknowledge the notice and create the account. Confirm the correct dashboard opens. Sign out and repeat Google sign-in; the role picker should no longer appear for that account.
