import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const THUMB_DIR = path.join(__dirname, '..', '..', 'uploads', 'properties', 'thumbnails');
fs.mkdirSync(THUMB_DIR, { recursive: true });

export async function generateThumbnail(
  sourcePath: string,
  width: number = 320,
  height: number = 240
): Promise<string> {
  const hash = crypto
    .createHash('md5')
    .update(sourcePath + Date.now())
    .digest('hex');
  const thumbName = `thumb_${hash}.webp`;
  const thumbPath = path.join(THUMB_DIR, thumbName);

  const thumbUrl = `/uploads/properties/thumbnails/${thumbName}`;

  try {
    await sharp(sourcePath)
      .resize(width, height, { fit: 'cover' })
      .webp({ quality: 75 })
      .toFile(thumbPath);

    return thumbUrl;
  } catch (err) {
    console.error('Thumbnail generation failed:', err);
    return '';
  }
}
