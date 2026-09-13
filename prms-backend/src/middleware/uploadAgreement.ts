import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'agreements');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `agr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});

const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png'];

const filter = (_req: any, file: any, cb: any) => {
  if (ALLOWED_MIME.includes(file.mimetype)) return cb(null, true);
  cb(new Error('Only PDF, JPEG or PNG files are accepted for a signed agreement copy'));
};

const uploadAgreement = multer({ storage, fileFilter: filter, limits: { fileSize: 15 * 1024 * 1024 } });
export default uploadAgreement;
