import { prisma } from '../../db';
import { AuthRequest } from '../../middleware/auth';
import { successResponse } from '../../utils/response';
import path from 'path';
import fs from 'fs';
import { generateThumbnail, deleteThumbnail, UPLOADS_DIR } from '../../services/thumbnail';

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'public', 'uploads');

interface FileUploadData {
  originalName: string;
  storageName: string;
  mimeType: string;
  fileSize: number;
  category: string;
  url: string;
  description?: string;
}

export async function uploadFile(userId: string, data: FileUploadData) {
  // Generate thumbnail for images
  let thumbnailUrl: string | null = null;
  const filePath = path.join(__dirname, '..', '..', 'public', data.url.replace(/^\/files\//, ''));

  try {
    const thumbInfo = await generateThumbnail({
      filePath,
      mimeType: data.mimeType,
      originalName: data.originalName,
    });
    if (thumbInfo) {
      thumbnailUrl = thumbInfo.url;
    }
  } catch (err) {
    console.error('service_fileUpload: thumbnail generation failed', err);
  }

  return prisma.userProfileFile.create({
    data: {
      userId,
      originalName: data.originalName,
      storageName: data.storageName,
      mimeType: data.mimeType,
      fileSize: data.fileSize,
      category: data.category,
      url: data.url,
      thumbnailUrl,
      description: data.description || null,
    },
  });
}

// Get user profile files (paginated)
export async function getUserFiles(userId: string, page = 1, limit = 10, category?: string) {
  const where: any = { userId };
  if (category) where.category = category;

  const [files, total] = await Promise.all([
    prisma.userProfileFile.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { created_at: 'desc' },
    }),
    prisma.userProfileFile.count({ where }),
  ]);
  return { files, total };
}

// Get ALL media (user files + property images) for a user
export async function getUserMedia(userId: string, fileType?: string) {
  const [userFiles, propertyImages] = await Promise.all([
    prisma.userProfileFile.findMany({
      where: { userId },
      include: { user: { select: { id: true, full_name: true, email: true } } },
    }),
    prisma.propertyImage.findMany({
      where: { property: { ownerId: userId } },
      include: { property: true },
    }),
  ]);

  const media: any[] = userFiles.map((f: any) => ({
    id: f.id,
    name: f.originalName,
    url: f.url,
    size: f.fileSize,
    mime_type: f.mimeType,
    thumbnail_url: f.thumbnailUrl,
    date_added: f.created_at.toISOString(),
    type: 'user',
    file_type: 'user',
  }));

  propertyImages.forEach((img: any) => {
    const mediaItem = {
      id: img.id,
      name: img.url.split('/').pop() || 'image',
      url: img.url,
      size: null,
      mime_type: 'image/jpeg',
      thumbnail_url: null,
      // PropertyImage has no created_at column in the schema, unlike
      // UserProfileFile — there's no timestamp to report here.
      date_added: null,
      type: 'property',
      file_type: 'property',
      property_title: img.property?.title,
    };
    media.push(mediaItem);
  });

  return media;
}

export async function getFileById(fileId: string) {
  const file = await prisma.userProfileFile.findUnique({
    where: { id: fileId },
  });
  return file || null;
}

export async function deleteFile(fileId: string) {
  const file = await prisma.userProfileFile.findUnique({
    where: { id: fileId },
  });

  if (!file) throw new Error('File not found');

  const filePath = path.join(__dirname, '..', '..', 'public', file.url.replace(/^\/files\//, ''));
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  if (file.thumbnailUrl) {
    const thumbStorageName = file.thumbnailUrl.replace(/^\/api\/files\/thumbnails\//, '');
    await deleteThumbnail(thumbStorageName);
  }

  return prisma.userProfileFile.delete({
    where: { id: fileId },
  });
}

// Delete a property image by its image ID
export async function deletePropertyImage(imageId: string) {
  const image = await prisma.propertyImage.findUnique({
    where: { id: imageId },
  });

  if (!image) throw new Error('Property image not found');

  const filePath = path.join(__dirname, '..', '..', 'public', image.url.replace(/^\/images\//, ''));
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  return prisma.propertyImage.delete({
    where: { id: imageId },
  });
}

export { successResponse, AuthRequest };
