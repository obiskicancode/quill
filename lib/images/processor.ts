import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

export const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MIN_IMAGE_WIDTH = 800;
export const MIN_IMAGE_HEIGHT = 600;

export interface ProcessedRoomImage {
  fullBuffer: Buffer;
  thumbBuffer: Buffer;
  blurDataUrl: string;
  width: number;
  height: number;
  format: 'webp';
  sizeBytes: number;
}

/**
 * Validates image buffer magic bytes against JPEG, PNG, and WebP signatures.
 */
export function validateImageMagicBytes(buffer: Buffer): {
  valid: boolean;
  mimeType?: string;
  error?: string;
} {
  if (!buffer || buffer.length < 12) {
    return { valid: false, error: 'File buffer is too small or empty' };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, mimeType: 'image/jpeg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { valid: true, mimeType: 'image/png' };
  }

  // WebP: RIFF (bytes 0-3) and WEBP (bytes 8-11)
  const isRiff =
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46;
  const isWebp =
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50;

  if (isRiff && isWebp) {
    return { valid: true, mimeType: 'image/webp' };
  }

  return {
    valid: false,
    error: 'Unsupported image format. Allowed formats are JPEG, PNG, and WebP.',
  };
}

/**
 * Strips metadata, resizes, converts to WebP, and generates thumbnail and blur data URL.
 */
export async function processRoomImage(
  buffer: Buffer,
): Promise<ProcessedRoomImage> {
  if (buffer.length > MAX_IMAGE_FILE_SIZE) {
    throw new Error('Image exceeds maximum allowed size of 10 MB');
  }

  const magicCheck = validateImageMagicBytes(buffer);
  if (!magicCheck.valid) {
    throw new Error(magicCheck.error || 'Invalid image file');
  }

  const image = sharp(buffer);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Could not read image dimensions');
  }

  if (metadata.width < MIN_IMAGE_WIDTH || metadata.height < MIN_IMAGE_HEIGHT) {
    throw new Error(
      `Image dimensions (${metadata.width}x${metadata.height}) are below required minimum (${MIN_IMAGE_WIDTH}x${MIN_IMAGE_HEIGHT} px)`,
    );
  }

  // Full WebP (Max 1920x1080 inside, strip EXIF metadata)
  const fullSharp = sharp(buffer)
    .rotate() // Auto-orient based on EXIF before stripping
    .resize({
      width: 1920,
      height: 1080,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 82 });

  const fullBuffer = await fullSharp.toBuffer();
  const fullMeta = await sharp(fullBuffer).metadata();

  // Thumbnail WebP (400x300 cover)
  const thumbBuffer = await sharp(buffer)
    .rotate()
    .resize(400, 300, { fit: 'cover' })
    .webp({ quality: 75 })
    .toBuffer();

  // Blur data URL (16x10 low-res WebP base64)
  const blurBuffer = await sharp(buffer)
    .rotate()
    .resize(16, 10, { fit: 'cover' })
    .webp({ quality: 20 })
    .toBuffer();

  const blurDataUrl = `data:image/webp;base64,${blurBuffer.toString('base64')}`;

  return {
    fullBuffer,
    thumbBuffer,
    blurDataUrl,
    width: fullMeta.width || metadata.width,
    height: fullMeta.height || metadata.height,
    format: 'webp',
    sizeBytes: fullBuffer.length,
  };
}

/**
 * Saves image buffers to storage (local public folder fallback or S3).
 */
export async function saveProcessedImage(params: {
  filenameBase: string;
  processed: ProcessedRoomImage;
}): Promise<{ imageUrl: string; thumbnailUrl: string }> {
  const { filenameBase, processed } = params;

  // Local uploads directory: <cwd>/public/uploads/rooms
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'rooms');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const fullFilename = `${filenameBase}.webp`;
  const thumbFilename = `${filenameBase}-thumb.webp`;

  const fullPath = path.join(uploadsDir, fullFilename);
  const thumbPath = path.join(uploadsDir, thumbFilename);

  await fs.promises.writeFile(fullPath, processed.fullBuffer);
  await fs.promises.writeFile(thumbPath, processed.thumbBuffer);

  return {
    imageUrl: `/uploads/rooms/${fullFilename}`,
    thumbnailUrl: `/uploads/rooms/${thumbFilename}`,
  };
}
