import multer from 'multer';
import path from 'path';
import fs from 'fs';

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'public', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_EXTENSIONS = new Set([
  // Images (strictly raster only - SVGs excluded to prevent stored XSS)
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp',
  // Videos
  '.mp4', '.webm', '.avi', '.mov', '.mkv', '.m4v',
  // Documents
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.txt', '.csv', '.rtf', '.odt',
]);

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
  'video/mp4', 'video/webm', 'video/x-msvideo', 'video/quicktime', 'video/x-matroska',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/rtf',
  'application/vnd.oasis.opendocument.text',
]);

const storage = multer.diskStorage({
  destination: (req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const id = (req as any).user?.id || 'guest';
    const ts = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : '.bin';
    cb(null, `${id}-${ts}-${Math.random().toString(36).slice(2, 8)}${safeExt}`);
  },
});

const fileFilter = (_req: any, file: any, cb: any) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === '.svg' || file.mimetype === 'image/svg+xml') {
    return cb(new Error('SVG files are not permitted due to security policies against embedded scripts.'));
  }
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return cb(new Error(`File extension ${ext} is not allowed. Only verified raster images, videos, and documents are accepted.`));
  }
  if (file.mimetype && !ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(new Error(`File content type (${file.mimetype}) does not match authorized upload policies.`));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB for documents
});

export default upload;
