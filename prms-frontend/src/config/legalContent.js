// Single source of truth for the exact wording shown to users and
// recorded on their consent records. Bump the version string whenever
// the wording changes materially, so historical consent records stay
// tied to the text the user actually saw.

export const PRIVACY_NOTICE_VERSION = '2.1';
export const PRIVACY_NOTICE_ACK_TEXT =
  'I acknowledge the Privacy Notice and consent to my personal data being processed for account and rental-management purposes.';

export const PRIVACY_NOTICE_ACK_TEXT_BM =
  'Saya mengakui Notis Perlindungan Data Peribadi dan bersetuju data peribadi saya diproses untuk tujuan pengurusan akaun dan penyewaan.';

export const MARKETING_CONSENT_VERSION = '1.0';
export const MARKETING_CONSENT_TEXT =
  'I would like to receive optional marketing communications (new listings, offers, newsletters). This is not required to use PRMS.';

export const MARKETING_CONSENT_TEXT_BM =
  'Saya ingin menerima komunikasi pemasaran pilihan (senarai hartanah baharu, tawaran, buletin). Ini bukan syarat mandatori untuk menggunakan PRMS.';

export const TERMS_VERSION = '1.0';
export const TERMS_ACK_TEXT =
  'I have read and agree to the Terms and Conditions.';

export const PRIVACY_NOTICE_SECTIONS = [
  {
    title: '1. What information we collect',
    body: 'Account details (full name, email, Malaysian phone number, identification/passport numbers where required for agreements), property and booking information, rental application details (move-in preferences, occupants, message to landlord), tenancy agreements, digital signatures, viewing appointment requests, maintenance service tickets and photos, messages sent through PRMS, and technical access timestamps.',
  },
  {
    title: '2. Why it is required (Purpose)',
    body: "To create and manage your account and demonstrate rental applications, tenancy agreements, viewings, maintenance and role-based access. Payments and agreement verification codes are simulated in this development project. Use sample data for testing; do not upload real identity documents or banking details.",
  },
  {
    title: '3. Mandatory vs optional data',
    body: "Required fields are identified in each form. Missing required information may prevent account creation or the requested rental task. Optional marketing consent can be declined without preventing use of the system.",
  },
  {
    title: '4. How your information is used',
    body: 'To operate the end-to-end rental lifecycle: tenancy applications, identity verification, agreement execution, viewing schedules, rent transaction records, maintenance ticket dispatch, and authenticated internal communications.',
  },
  {
    title: '5. Who it may be disclosed to',
    body: "Rental information is accessible to the relevant Tenant, property owner, assigned Agent and authorised Admin according to their permissions. Property listing images and profile avatars may be publicly accessible. Google sign-in uses Firebase and Google; password recovery uses the configured email provider. These providers process the information needed to deliver their services. PRMS does not sell personal data.",
  },
  {
    title: '6. Hosting and cross-border transfers',
    body: "The current demonstration runs on the project computer with a local MySQL database and local uploaded files. When a Cloudflare demonstration tunnel is enabled, traffic passes through Cloudflare. Firebase/Google and email services may process information outside Malaysia. Permanent hosting and its storage location are not yet selected. Hosting, provider locations and safeguards must be reviewed before real personal data is used; this notice does not claim verified storage encryption or a particular TLS version.",
  },
  {
    title: '7. Retention and disposal',
    body: "Admin can review retention policies and preview records eligible for cleanup. Permanent retention cleanup is disabled; there is no automatic deletion schedule. Archiving hides records from the relevant list and does not delete them. Approved account-closure requests anonymise basic profile details and deactivate the account, while related records and files remain. Admin reviews requests and records the action taken. Retention periods, retained files and backups must be reviewed before real-data deployment.",
  },
  {
    title: '8. Your rights under Malaysia PDPA',
    body: "Use Settings > Privacy & Personal Data to review selected stored information, submit an access or correction request, withdraw optional consent, or request account closure. Requests are reviewed by Admin; they do not automatically erase all records. Closure may require active applications, tenancies and owned listings to be resolved first. Contact the project administrator if the overview does not include information you need.",
  },
  {
    title: '9. Withdrawing consent',
    body: 'Optional consent (such as promotional marketing) can be withdrawn at any time without penalty. Withdrawing core data processing consent requires account closure, as core personal data is essential for ongoing tenancy contract management.',
  },
  {
    title: '10. Privacy contact',
    body: "For this development project, submit privacy requests through Settings > Privacy & Personal Data, or contact the project administrator using the contact details supplied with your test invitation. A production privacy contact and any formal DPO appointment have not been confirmed. Do not send passwords, identity documents or banking details with feedback.",
  },
];

export const PRIVACY_NOTICE_SECTIONS_BM = [
  {
    title: '1. Maklumat yang kami kumpulkan',
    body: 'Butiran akaun (nama penuh, emel, nombor telefon Malaysia, nombor kad pengenalan/pasport bagi urusan perjanjian), maklumat hartanah dan tempahan, butiran permohonan sewa (tarikh masuk, bilangan penghuni, mesej kepada pemilik), perjanjian penyewaan, tandatangan digital, temu janji lawatan hartanah, tiket penyelenggaraan dan gambar berkaitan, mesej melalui PRMS, dan log capaian teknikal.',
  },
  {
    title: '2. Tujuan pemprosesan data',
    body: "Untuk mengurus akaun dan mendemonstrasikan permohonan sewa, perjanjian, lawatan, penyelenggaraan dan kawalan akses mengikut peranan. Bayaran dan kod pengesahan perjanjian adalah simulasi dalam projek pembangunan ini. Gunakan data contoh untuk ujian; jangan muat naik dokumen identiti sebenar atau butiran perbankan.",
  },
  {
    title: '3. Data mandatori dan pilihan',
    body: "Medan wajib ditandakan pada setiap borang. Maklumat wajib yang tidak lengkap boleh menghalang pendaftaran atau urusan sewa yang diminta. Persetujuan pemasaran pilihan boleh ditolak tanpa menghalang penggunaan sistem.",
  },
  {
    title: '4. Cara maklumat anda digunakan',
    body: 'Untuk mengendalikan kitaran lengkap penyewaan: permohonan sewa, pengesahan identiti, pelaksanaan perjanjian sewa, penjadualan lawatan, rekod transaksi sewa, tindakan tiket penyelenggaraan, dan komunikasi selamat antara pihak berkepentingan.',
  },
  {
    title: '5. Penzahiran data peribadi',
    body: "Maklumat sewaan boleh diakses oleh Penyewa berkaitan, pemilik hartanah, Ejen yang ditugaskan dan Pentadbir mengikut kebenaran mereka. Gambar penyenaraian dan avatar profil mungkin boleh diakses secara awam. Log masuk Google menggunakan Firebase dan Google; pemulihan kata laluan menggunakan penyedia emel yang dikonfigurasi. Penyedia ini memproses maklumat yang diperlukan untuk perkhidmatan mereka. PRMS tidak menjual data peribadi.",
  },
  {
    title: '6. Lokasi pengehosan dan pemindahan rentas sempadan',
    body: "Demonstrasi semasa dijalankan pada komputer projek dengan pangkalan data MySQL dan fail muat naik tempatan. Apabila terowong demonstrasi Cloudflare diaktifkan, trafik melalui Cloudflare. Firebase/Google dan perkhidmatan emel mungkin memproses maklumat di luar Malaysia. Pengehosan tetap dan lokasi simpanan belum dipilih. Lokasi penyedia dan langkah perlindungan perlu disemak sebelum menggunakan data peribadi sebenar; notis ini tidak mendakwa penyulitan simpanan yang disahkan atau versi TLS tertentu.",
  },
  {
    title: '7. Penyimpanan dan pelupusan data',
    body: "Pentadbir boleh menyemak polisi simpanan dan pratonton rekod yang layak untuk pembersihan. Pembersihan kekal dinyahaktifkan; tiada jadual pemadaman automatik. Pengarkiban menyembunyikan rekod daripada senarai berkaitan dan tidak memadamkannya. Permohonan penutupan akaun yang diluluskan menganonimkan butiran profil asas dan menyahaktifkan akaun, manakala rekod serta fail berkaitan dikekalkan. Pentadbir menyemak permohonan dan merekodkan tindakan. Tempoh simpanan, fail dan sandaran perlu disemak sebelum penggunaan data sebenar.",
  },
  {
    title: '8. Hak anda di bawah APDP 2010',
    body: "Gunakan Tetapan > Privasi & Data Peribadi untuk melihat maklumat tersimpan terpilih, menghantar permohonan akses atau pembetulan, menarik balik persetujuan pilihan, atau memohon penutupan akaun. Permohonan disemak oleh Pentadbir dan tidak memadamkan semua rekod secara automatik. Permohonan, penyewaan dan penyenaraian aktif mungkin perlu diselesaikan terlebih dahulu. Hubungi pentadbir projek jika maklumat yang diperlukan tiada dalam gambaran keseluruhan.",
  },
  {
    title: '9. Penarikan balik persetujuan',
    body: 'Persetujuan pilihan (seperti emel promosi) boleh ditarik balik pada bila-bila masa tanpa sebarang penalti. Penarikan balik persetujuan pemprosesan data teras memerlukan penutupan akaun kerana data tersebut penting untuk pengurusan kontrak penyewaan aktif.',
  },
  {
    title: '10. Hubungan privasi',
    body: "Untuk projek pembangunan ini, hantar permohonan melalui Tetapan > Privasi & Data Peribadi atau hubungi pentadbir projek menggunakan butiran hubungan dalam jemputan ujian. Pegawai hubungan privasi bagi penggunaan sebenar dan sebarang pelantikan rasmi DPO belum disahkan. Jangan hantar kata laluan, dokumen identiti atau butiran perbankan bersama maklum balas.",
  },
];

export const TERMS_SECTIONS = [
  {
    title: '1. Purpose of this platform',
    body: 'PRMS is a property rental management system facilitating the complete rental workflow: discovery, application, review, agreement, digital signing, active tenancy management, maintenance, and closure. Simulated payment features demonstrate checkout workflows with Malaysian Ringgit (RM).',
  },
  {
    title: '2. Accounts and credentials',
    body: 'Users are responsible for the truthfulness and accuracy of the profile information provided, and for safeguarding their login credentials and authentication sessions.',
  },
  {
    title: '3. Role conduct and obligations',
    body: 'Tenants, Landlords, and Agents agree to utilize the platform strictly for legitimate tenancy and property administration activity within their role\'s authorized permissions.',
  },
  {
    title: '4. Compliance and fair use',
    body: 'All users agree to adhere to applicable Malaysian laws including the Personal Data Protection Act 2010, and refrain from submitting fraudulent listings, abusive messages, or unauthorized access attempts.',
  },
];
