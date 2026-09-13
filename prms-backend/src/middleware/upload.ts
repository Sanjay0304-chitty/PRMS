import multer from 'multer';
import path from 'path';
import fs from 'fs';

const IMAGE_DIR = path.join(__dirname, '..', '..', 'public', 'images');

if (!fs.existsSync(IMAGE_DIR)) {
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => cb(null, IMAGE_DIR),
  filename: (req, file, cb) => {
    const id = (req as any).user?.id || 'guest';
    const ts = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext) ? ext : '.jpg';
    cb(null, `${id}-${ts}-${Math.random().toString(36).slice(2, 8)}${safeExt}`);
  },
});

const fileFilter = (_req: any, file: any, cb: any) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only image files are allowed'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

export default upload;
