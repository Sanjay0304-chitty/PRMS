// Single source of truth for the exact wording shown to users and
// recorded on their consent records. Bump the version string whenever
// the wording changes materially, so historical consent records stay
// tied to the text the user actually saw.

export const PRIVACY_NOTICE_VERSION = '2.0';
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
    body: 'To create and manage your account, process rental applications, generate and execute legally-binding tenancy agreements, coordinate physical and virtual property viewings, manage property maintenance workflows, and operate role-based access control (Tenant, Landlord, Agent, Admin) across the platform.',
  },
  {
    title: '3. Mandatory vs optional data',
    body: 'Account registration and rental-management data are mandatory under contractual necessity to use PRMS. Marketing communications and optional notifications are voluntary and never required to apply for or rent a property.',
  },
  {
    title: '4. How your information is used',
    body: 'To operate the end-to-end rental lifecycle: tenancy applications, identity verification, agreement execution, viewing schedules, rent transaction records, maintenance ticket dispatch, and authenticated internal communications.',
  },
  {
    title: '5. Who it may be disclosed to',
    body: 'Data is strictly shared only with parties directly involved in your tenancy: the verified Landlord who owns the property, explicitly assigned Agents managing that property, authorized system Administrators, and lawful Malaysian law enforcement authorities where legally mandated by court order or statute. PRMS never sells personal data or shares it with third-party advertisers.',
  },
  {
    title: '6. Hosting and cross-border transfers',
    body: 'Personal data is securely hosted in Asia-Pacific cloud infrastructure located in Singapore and Malaysia. Where secondary cloud infrastructure processes data across borders, transfers are governed by standard contractual clauses (SCCs) and high-grade technical safeguards including AES-256 encryption at rest and TLS 1.3 in transit, fully complying with Section 129 of the Personal Data Protection Act 2010 (PDPA).',
  },
  {
    title: '7. Retention and disposal',
    body: 'Personal data is retained only as long as necessary to fulfill tenancy administration, statutory accounting, and legal dispute limitation periods (up to 7 years for financial/contractual records, 90 to 180 days for inactive viewing and transient notification records). Operational cleanup and data anonymization procedures are executed under Admin governance.',
  },
  {
    title: '8. Your rights under Malaysia PDPA',
    body: 'Under the PDPA 2010, you have the right to request access to your personal data, request correction of inaccurate data, withdraw voluntary consent, or request account deletion and data anonymization at any time via Settings > Privacy & Personal Data.',
  },
  {
    title: '9. Withdrawing consent',
    body: 'Optional consent (such as promotional marketing) can be withdrawn at any time without penalty. Withdrawing core data processing consent requires account closure, as core personal data is essential for ongoing tenancy contract management.',
  },
  {
    title: '10. Data Protection Officer (DPO) Contact',
    body: 'For any inquiries, requests to exercise your data subject rights, or privacy concerns, please contact our Data Protection Officer:\n\n• Officer: Adrian Chew (Lead Data Protection Officer)\n• Department: Compliance & Data Protection Unit\n• Email: privacy@prms-malaysia.com / dpo@prms.com.my\n• Address: Level 18, Menara PRMS, Jalan Tun Razak, 50400 Kuala Lumpur, Malaysia.',
  },
];

export const PRIVACY_NOTICE_SECTIONS_BM = [
  {
    title: '1. Maklumat yang kami kumpulkan',
    body: 'Butiran akaun (nama penuh, emel, nombor telefon Malaysia, nombor kad pengenalan/pasport bagi urusan perjanjian), maklumat hartanah dan tempahan, butiran permohonan sewa (tarikh masuk, bilangan penghuni, mesej kepada pemilik), perjanjian penyewaan, tandatangan digital, temu janji lawatan hartanah, tiket penyelenggaraan dan gambar berkaitan, mesej melalui PRMS, dan log capaian teknikal.',
  },
  {
    title: '2. Tujuan pemprosesan data',
    body: 'Untuk mendaftar dan mentadbir akaun anda, memproses permohonan sewa hartanah, menjana dan menyempurnakan perjanjian penyewaan, menyelaras temu janji lawatan, menguruskan pembaikan dan penyelenggaraan hartanah, serta mengendalikan kawalan capaian berasaskan peranan (Penyewa, Pemilik Hartanah, Ejen, Pentadbir).',
  },
  {
    title: '3. Data mandatori dan pilihan',
    body: 'Maklumat akaun dan pengurusan sewa adalah mandatori di bawah keperluan kontrak untuk menggunakan PRMS. Komunikasi pemasaran dan promosi adalah pilihan dan tidak wajib untuk menyewa hartanah.',
  },
  {
    title: '4. Cara maklumat anda digunakan',
    body: 'Untuk mengendalikan kitaran lengkap penyewaan: permohonan sewa, pengesahan identiti, pelaksanaan perjanjian sewa, penjadualan lawatan, rekod transaksi sewa, tindakan tiket penyelenggaraan, dan komunikasi selamat antara pihak berkepentingan.',
  },
  {
    title: '5. Penzahiran data peribadi',
    body: 'Data peribadi hanya dizahirkan kepada pihak yang berkaitan secara langsung dengan penyewaan anda: Pemilik yang memiliki hartanah berkenaan, Ejen sah yang ditugaskan, Pentadbir sistem yang diberi kuasa, dan pihak berkuasa undang-undang Malaysia sekiranya diwajibkan oleh perintah mahkamah atau statutori. PRMS tidak sesekali menjual data peribadi anda kepada pihak ketiga.',
  },
  {
    title: '6. Lokasi pengehosan dan pemindahan rentas sempadan',
    body: 'Data peribadi dihoskan secara selamat di pusat data awan rantau Asia-Pasifik (Singapura dan Malaysia). Sebarang pemindahan rentas sempadan tertakluk kepada klausa kontrak standard serta penyulitan AES-256 (semasa simpanan) dan TLS 1.3 (semasa penghantaran), selaras dengan Seksyen 129 Akta Perlindungan Data Peribadi 2010 (APDP).',
  },
  {
    title: '7. Penyimpanan dan pelupusan data',
    body: 'Data peribadi disimpan hanya selama yang diperlukan untuk memenuhi tujuan pengurusan penyewaan, keperluan perakaunan berkanun, dan had masa pertikaian undang-undang (sehingga 7 tahun bagi rekod kontrak/kewangan, 90 hingga 180 hari bagi rekod temu janji dan notifikasi tidak aktif). Pelupusan dan proses penganoniman data dikendalikan secara berkala.',
  },
  {
    title: '8. Hak anda di bawah APDP 2010',
    body: 'Di bawah APDP 2010, anda berhak meminta akses kepada data peribadi anda, membetulkan data yang tidak tepat, menarik balik persetujuan pilihan, atau meminta pemadaman akaun dan penganoniman data pada bila-bila masa melalui Tetapan > Privasi & Data Peribadi.',
  },
  {
    title: '9. Penarikan balik persetujuan',
    body: 'Persetujuan pilihan (seperti emel promosi) boleh ditarik balik pada bila-bila masa tanpa sebarang penalti. Penarikan balik persetujuan pemprosesan data teras memerlukan penutupan akaun kerana data tersebut penting untuk pengurusan kontrak penyewaan aktif.',
  },
  {
    title: '10. Hubungi Pegawai Perlindungan Data (DPO)',
    body: 'Untuk sebarang pertanyaan, permohonan menggunakan hak subjek data, atau kemusykilan privasi, sila hubungi Pegawai Perlindungan Data kami:\n\n• Pegawai: Adrian Chew (Ketua Pegawai Perlindungan Data)\n• Unit: Unit Pematuhan & Perlindungan Data\n• Emel: privacy@prms-malaysia.com / dpo@prms.com.my\n• Alamat: Aras 18, Menara PRMS, Jalan Tun Razak, 50400 Kuala Lumpur, Malaysia.',
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
