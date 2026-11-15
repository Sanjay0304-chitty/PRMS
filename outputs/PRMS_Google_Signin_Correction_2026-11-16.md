# Google sign-in regression correction

The running database audit confirmed that recent failed sign-ins were rejected with “Google account already linked”. Two accounts still had old development-only identity placeholders.

The security update removed unverified Google login but did not initially recognise `dev-<email>` as an old placeholder. Genuine Google verification therefore succeeded before account linking incorrectly refused the account.

The controller now upgrades only the exact placeholder matching the verified Google email. The update is conditional on the existing account identity and active status. It does not accept a browser-selected email, replace an unrelated development placeholder, overwrite an existing genuine Firebase identity or enable the old email-only login path. Account linking happens during sign-in rather than through a bulk database change.

Verification: all 318 backend tests passed across 37 suites, and the backend production build passed. New tests cover successful same-email placeholder upgrade and rejection of a different-email placeholder. The browser tool could not trigger Google sign-in reliably during the follow-up; successful real-account sign-in is not claimed by these tests.

Refresh the login page and try Google with the previously registered account. A development backend should reload the change automatically; restart a production backend after building. The COOP warnings in the screenshot are separate from the confirmed account-linking rejection. No credentials were changed, no accounts were reset, and nothing was committed or pushed.
