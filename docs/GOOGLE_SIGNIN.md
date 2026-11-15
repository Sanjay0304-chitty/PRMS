# Google sign in and first account setup

New users can click Google on the login page without first completing email/password registration. After Google verifies their identity, PRMS opens role selection with Tenant, Landlord and Agent options. They choose a role, acknowledge the privacy notice and create their account. No Admin self-registration is available.

Returning users sign in to their existing role. Existing password accounts with the same verified Google email can be safely linked. The exact older dev-email placeholder is upgraded on sign-in, while conflicting genuine Firebase identities remain blocked.

A new verified identity receives a ten-minute registration-only grant. It is not an access or refresh token and does not create a default Tenant account. POST /auth/google/register validates the grant, restricts the role, requires acknowledgement and creates the user, role, optional Agent profile and consent in one database transaction. Duplicate identities and replayed grants cannot replace an existing account or change its role.

The frontend stores the pending grant in session storage so setup can resume after a refresh. Expired setup directs the user to repeat Google sign-in. Full session tokens are issued only after account creation. Both Google endpoints require Firebase verification to be enabled.

No schema migration or database reseed is required. Firebase project configuration and the site's authorised domain are still required. This flow does not expose an Admin account, bypass Google verification or change existing users' roles.
