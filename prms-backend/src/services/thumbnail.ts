import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export const THUMBNAIL_DIR = path.join(__dirname, '..', '..', 'public', 'thumbnails');
export const UPLOADS_DIR = path.join(__dirname, '..', '..', 'public', 'uploads');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

interface ThumbnailResult {
  storageName: string;
  url: string;
}

export interface GenerateOptions {
  filePath: string;
  mimeType: string;
  originalName: string;
}

export async function generateThumbnail(options: GenerateOptions): Promise<ThumbnailResult | null> {
  const { filePath, mimeType, originalName } = options;

  try {
    if (!fs.existsSync(filePath)) {
      console.error('thumbnail: source file not found:', filePath);
      return null;
    }

    if (mimeType.startsWith('image/')) {
      return await generateImageThumbnail(filePath, originalName);
    }

    return null;
  } catch (err) {
    console.error('thumbnail: generation failed for', originalName, err);
    return null;
  }
}

async function generateImageThumbnail(filePath: string, originalName: string): Promise<ThumbnailResult> {
  ensureDir(THUMBNAIL_DIR);

  const ext = path.extname(originalName).toLowerCase();
  const safeExt = ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext) ? ext : '.jpg';
  const storageName = `thumb-${uuidv4()}${safeExt}`;
  const thumbPath = path.join(THUMBNAIL_DIR, storageName);

  await sharp(filePath)
    .resize(400, 400, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .toFile(thumbPath);

  return {
    storageName,
    url: `/api/files/thumbnails/${storageName}`,
  };
}

export async function deleteThumbnail(storageName: string): Promise<void> {
  const thumbPath = path.join(THUMBNAIL_DIR, storageName);
  try {
    if (fs.existsSync(thumbPath)) {
      fs.unlinkSync(thumbPath);
    }
  } catch (err) {
    console.error('thumbnail: delete failed for', storageName, err);
  }
}
