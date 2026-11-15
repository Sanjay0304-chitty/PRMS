# Security corrections from final regression testing

Google sign-in now requires a verified Firebase Google-provider token and verified email. Account lookup and linking use that token's UID and email. A conflicting email in the request is rejected. Linking an active local account uses a conditional database update to prevent overwriting a concurrent identity change. Email-only development sign-in has been removed.

Follow-up regression correction: older Google sign-ins created `dev-<email>` placeholders. A placeholder matching the verified token email is now upgraded to the actual Firebase UID on successful sign-in. A placeholder for a different email and any conflicting genuine Firebase UID remain rejected. Backend tests now total 318 passing tests, including both legacy-placeholder cases. Existing accounts are not reset or bulk modified.

Set `ENABLE_FIREBASE_VERIFY=true` and the matching `FIREBASE_PROJECT_ID` in the private backend environment. The verifier uses a named Firebase app with an explicit project ID and Google's public token-signing certificates. Optional service-account configuration remains supported; never place a private service-account key in the frontend or repository. This change does not authorise a new website domain in Firebase; final hosting still needs the correct authorised domain.

The login page validates email syntax locally rather than querying registration status. The compatibility email-check endpoint returns a generic response without account existence or active status. Failed password sign-in uses one generic message and performs a password comparison even for unknown accounts.

Privacy notice version 2.1 describes the current local demo, providers, public media, selected-data overview and limited account anonymisation. Unsupported cloud location, encryption and named DPO/office claims have been removed from both languages. Retention behaviour remains unchanged and permanent cleanup remains disabled. A monitored production privacy contact still needs confirmation.

Backend dependencies were updated and targeted overrides patch glob/minimatch under rimraf. These overrides cross transitive major versions, so Node 24 and the regression checks are important. No direct Firebase major upgrade or forced npm audit upgrade was performed. Production dependency audits are clean at verification time; development-tool advisories remain separately documented in the test report.

See the updated results in `outputs/PRMS_Security_Fix_Verification_2026-11-16.md`. Nothing has been committed or pushed by this task.
