import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'properties');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `prop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});

const ALLOWED_MIME: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'],
  video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
  document: ['application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
};

const filter = (_req: any, file: any, cb: any) => {
  const field = file.fieldname;
  const allowed = ALLOWED_MIME[field];
  if (allowed && allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error('Unsupported file type for this field'));
};

const uploadProperty = multer({ storage, fileFilter: filter, limits: { fileSize: 50 * 1024 * 1024 } });
export default uploadProperty;