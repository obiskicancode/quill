import crypto from 'crypto';
import { NextRequest } from 'next/server';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import { addRoomTypeImage } from '@/lib/db/repositories/inventory.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { processRoomImage, saveProcessedImage } from '@/lib/images/processor';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardAdminApi(request, { permission: 'rooms.manage' });
  if (!guard.ok) return guard.response;

  const { id: roomTypeId } = await params;

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const altText = (formData.get('altText') as string) || '';
    const caption = (formData.get('caption') as string) || '';
    const isCover = formData.get('isCover') === 'true';

    if (!file || !(file instanceof Blob)) {
      return apiFail(400, ERROR_MESSAGES.IMAGE_FILE_REQUIRED);
    }

    if (!altText.trim()) {
      return apiFail(422, ERROR_MESSAGES.ALT_TEXT_REQUIRED_FOR_ACCESSIBILITY);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process image: EXIF strip, dimensions check, WebP full, thumb, blurDataUrl
    const processed = await processRoomImage(buffer);

    const filenameBase = `${roomTypeId}-${crypto.randomBytes(6).toString('hex')}`;
    const { imageUrl, thumbnailUrl } = await saveProcessedImage({
      filenameBase,
      processed,
    });

    const roomImage = await addRoomTypeImage({
      roomTypeId,
      imageUrl,
      thumbnailUrl,
      blurDataUrl: processed.blurDataUrl,
      width: processed.width,
      height: processed.height,
      altText: altText.trim(),
      caption: caption.trim() || undefined,
      isCover,
    });

    return apiOk(roomImage);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : ERROR_MESSAGES.FAILED_TO_UPLOAD_PHOTO;
    return apiFail(400, message);
  }
}
