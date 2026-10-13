import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'maintenance');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `mnt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const uploadMaintenance = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only JPEG, PNG or WebP maintenance photographs are accepted'));
  },
  limits: { fileSize: 10 * 1024 * 1024, files: 6 },
});

export default uploadMaintenance;
