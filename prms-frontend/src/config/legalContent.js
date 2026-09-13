// Single source of truth for the exact wording shown to users and
// recorded on their consent records. Bump the version string whenever
// the wording changes materially, so historical consent records stay
// tied to the text the user actually saw.

export const PRIVACY_NOTICE_VERSION = '1.0';
export const PRIVACY_NOTICE_ACK_TEXT =
  'I acknowledge the Privacy Notice and consent to my personal data being processed for account and rental-management purposes.';

export const MARKETING_CONSENT_VERSION = '1.0';
export const MARKETING_CONSENT_TEXT =
  'I would like to receive optional marketing communications (new listings, offers, newsletters). This is not required to use PRMS.';

export const TERMS_VERSION = '1.0';
export const TERMS_ACK_TEXT =
  'I have read and agree to the Terms and Conditions.';

export const PRIVACY_NOTICE_SECTIONS = [
  {
    title: 'What information we collect',
    body: 'Account details (name, email, phone), property and booking information, rental application details (move-in preferences, occupants, message to landlord), tenancy agreements and signatures, viewing appointment requests, maintenance requests, messages sent through PRMS, and technical information such as login timestamps.',
  },
  {
    title: 'Why it is required',
    body: 'To create and manage your account, process rental applications and agreements, coordinate viewings and maintenance, and operate role-based access (Tenant, Landlord, Agent, Admin) across the platform.',
  },
  {
    title: 'Mandatory vs optional',
    body: 'Account and rental-management information is mandatory to use PRMS. Marketing communications are optional and never required to register, apply, or rent a property.',
  },
  {
    title: 'How your information is used',
    body: 'To operate the rental workflow described above: applications, agreements, viewings, tenancy management, maintenance, and messaging between the relevant parties.',
  },
  {
    title: 'Who it may be disclosed to',
    body: 'Only the parties relevant to a specific property or tenancy: the Landlord who owns the property, an Agent explicitly assigned to it, and platform Administrators for authorised administrative purposes. PRMS does not sell personal data or share it for unrelated marketing.',
  },
  {
    title: 'Overseas transfer',
    body: 'This is a university demonstration project. Where a hosting or authentication provider outside Malaysia is used for the deployed environment, that will be identified here and covered by appropriate safeguards before any production use.',
  },
  {
    title: 'Retention',
    body: 'Personal data is kept only as long as necessary for the purposes above, following the retention schedule maintained by the Admin team (see Privacy & Personal Data for your own request options).',
  },
  {
    title: 'Your rights',
    body: 'You may access, request correction of, or request deletion of your personal data, and withdraw optional consent (such as marketing) at any time, from Settings > Privacy & Personal Data.',
  },
  {
    title: 'Withdrawing consent',
    body: 'Optional consent (e.g. marketing) can be withdrawn at any time from Privacy & Personal Data without affecting your ability to use PRMS. Withdrawing the Privacy Notice acknowledgement itself requires an account deletion request, since it underpins account and rental-management processing.',
  },
  {
    title: 'Contact',
    body: 'For any privacy question or to exercise your rights, contact the Privacy Officer listed in Privacy & Personal Data, or use the in-app privacy request form.',
  },
];

export const TERMS_SECTIONS = [
  {
    title: 'Purpose of this platform',
    body: 'PRMS is a university project demonstrating a long-term property rental management workflow: application, review, agreement, signing, move-in, active tenancy, and closure. Payment features are simulated and do not process real funds.',
  },
  {
    title: 'Accounts',
    body: 'You are responsible for the accuracy of the information you provide and for keeping your login credentials secure.',
  },
  {
    title: 'Role conduct',
    body: 'Tenants, Landlords and Agents agree to use the platform only for legitimate rental-management activity within their role\'s permitted actions.',
  },
  {
    title: 'No legal certification',
    body: 'This system is designed to support good data-handling practice; it is a university implementation checklist, not a certified legal compliance product.',
  },
];
