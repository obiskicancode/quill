'use client';

import Image from 'next/image';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  Image as ImageIcon,
  Loader2,
  Star,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import type { AdminRoomImage } from '@/types/inventory.types';

interface TabPhotosProps {
  roomTypeId: string;
  initialPhotos: AdminRoomImage[];
  onRefresh: () => Promise<void>;
}

export function TabPhotos({
  roomTypeId,
  initialPhotos,
  onRefresh,
}: TabPhotosProps) {
  const [photos, setPhotos] = useState<AdminRoomImage[]>(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Upload inputs
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingAltText, setPendingAltText] = useState('');
  const [pendingCaption, setPendingCaption] = useState('');

  // Editing alt text inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAlt, setEditAlt] = useState('');
  const [editCaption, setEditCaption] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const atMaxPhotos = photos.length >= 8;

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage(ERROR_MESSAGES.FILE_TOO_LARGE);
      return;
    }

    setPendingFile(file);
    // Suggest default alt text from filename
    setPendingAltText(
      file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .trim(),
    );
  }

  async function handleUpload() {
    if (!pendingFile) return;
    if (!pendingAltText.trim()) {
      setErrorMessage(ERROR_MESSAGES.ALT_TEXT_REQUIRED_PUBLISHING);
      return;
    }

    setUploading(true);
    setUploadProgress(20);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', pendingFile);
      formData.append('altText', pendingAltText.trim());
      formData.append('caption', pendingCaption.trim());
      formData.append('isCover', photos.length === 0 ? 'true' : 'false');

      setUploadProgress(60);
      const res = await adminService.uploadRoomImage(roomTypeId, formData);
      setUploadProgress(100);

      if (res.data) {
        setSuccessMessage(SUCCESS_MESSAGES.PHOTO_UPLOADED);
        setPendingFile(null);
        setPendingAltText('');
        setPendingCaption('');
        await onRefresh();
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : ERROR_MESSAGES.FAILED_TO_UPLOAD_PHOTO,
      );
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  }

  async function handleMove(index: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= photos.length) return;

    const updated = [...photos];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    const items = updated.map((p, idx) => ({
      id: p.id,
      sortOrder: idx + 1,
    }));

    setPhotos(updated);

    try {
      await adminService.reorderRoomImages(roomTypeId, items);
    } catch {
      setErrorMessage(ERROR_MESSAGES.FAILED_TO_REORDER_PHOTOS);
      await onRefresh();
    }
  }

  async function handleSetCover(photo: AdminRoomImage) {
    try {
      await adminService.updateImage(photo.id, {
        altText: photo.altText,
        caption: photo.caption,
        isCover: true,
      });
      setSuccessMessage(SUCCESS_MESSAGES.COVER_PHOTO_SET);
      await onRefresh();
    } catch {
      setErrorMessage(ERROR_MESSAGES.FAILED_TO_SET_COVER_PHOTO);
    }
  }

  async function handleSaveEdit(photoId: string) {
    if (!editAlt.trim()) {
      setErrorMessage(ERROR_MESSAGES.ALT_TEXT_CANNOT_BE_EMPTY);
      return;
    }

    setIsUpdating(true);
    try {
      await adminService.updateImage(photoId, {
        altText: editAlt.trim(),
        caption: editCaption.trim() || null,
      });
      setEditingId(null);
      await onRefresh();
    } catch {
      setErrorMessage(ERROR_MESSAGES.FAILED_TO_UPDATE_PHOTO_DETAILS);
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDelete(photoId: string) {
    if (!confirm('Are you sure you want to delete this photo?')) return;
    try {
      await adminService.deleteImage(photoId);
      await onRefresh();
    } catch {
      setErrorMessage(ERROR_MESSAGES.FAILED_TO_DELETE_PHOTO);
    }
  }

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div
          role="alert"
          className="rounded-card border-destructive/40 bg-destructive/10 text-small text-destructive flex items-center gap-3 border p-4"
        >
          <AlertCircle className="size-5 shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="rounded-card border-success/40 bg-success/10 text-small text-success flex items-center justify-between border p-4"
        >
          <div className="flex items-center gap-2">
            <Check className="size-5 shrink-0" />
            <p>{successMessage}</p>
          </div>
          <Button
            type="button"
            variant="link"
            size="xs"
            onClick={() => setSuccessMessage(null)}
            className="text-success h-auto p-0 text-xs underline"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Upload Zone */}
      {!atMaxPhotos ? (
        <div className="rounded-card border-line bg-card border-2 border-dashed p-6 text-center">
          <UploadCloud className="text-muted-foreground mx-auto size-10" />
          <p className="text-foreground text-small mt-2 font-medium">
            Upload Room Photos (Up to 8 images, JPEG, PNG, or WebP)
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Max 10 MB per image. Processed automatically into responsive WebP
            formats with EXIF stripped.
          </p>

          <Input
            type="file"
            id="photoUploadInput"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />

          {!pendingFile ? (
            <div className="mt-4">
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  document.getElementById('photoUploadInput')?.click()
                }
              >
                Choose Photo
              </Button>
            </div>
          ) : (
            <div className="border-line bg-paper mx-auto mt-4 max-w-lg rounded border p-4 text-left">
              <p className="text-foreground text-small font-semibold">
                Selected: {pendingFile.name} (
                {(pendingFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>

              <div className="mt-3 space-y-1.5">
                <Label
                  htmlFor="upload-alt-text"
                  className="text-foreground text-xs font-medium"
                >
                  Alt Text (Required for accessibility & active status){' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="upload-alt-text"
                  type="text"
                  required
                  value={pendingAltText}
                  onChange={(e) => setPendingAltText(e.target.value)}
                  placeholder="e.g. Spacious king bedroom with ocean-facing balcony"
                />
              </div>

              <div className="mt-3 space-y-1.5">
                <Label
                  htmlFor="upload-caption"
                  className="text-foreground text-xs font-medium"
                >
                  Caption (Optional)
                </Label>
                <Input
                  id="upload-caption"
                  type="text"
                  value={pendingCaption}
                  onChange={(e) => setPendingCaption(e.target.value)}
                  placeholder="e.g. Balcony sunset view"
                />
              </div>

              {uploadProgress !== null && (
                <div className="mt-3">
                  <div className="bg-line h-2 w-full overflow-hidden rounded">
                    <div
                      className="bg-brand h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Uploading and processing...
                  </p>
                </div>
              )}

              <div className="mt-4 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setPendingFile(null)}
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleUpload}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-1.5 size-4 animate-spin" />{' '}
                      Uploading...
                    </>
                  ) : (
                    'Upload Photo'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-card border-line bg-paper text-small text-muted-foreground border p-4 text-center">
          Maximum of 8 photos reached. Delete an existing photo to upload a new
          one.
        </div>
      )}

      {/* Photos Grid / List */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-foreground font-semibold">
            Current Photos ({photos.length} of 8)
          </h3>
          <p className="text-muted-foreground text-xs">
            First photo or photo marked with ★ is used as the cover on listings.
          </p>
        </div>

        {photos.length === 0 ? (
          <div className="rounded-card border-line bg-paper text-muted-foreground mt-4 border p-8 text-center">
            <ImageIcon className="mx-auto size-8 opacity-40" />
            <p className="text-small mt-2">
              No photos uploaded for this room type yet.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {photos.map((p, idx) => (
              <div
                key={p.id}
                className={`rounded-card relative flex flex-col overflow-hidden border ${
                  p.isCover ? 'border-brand ring-brand ring-1' : 'border-line'
                } bg-card`}
              >
                {/* Image display */}
                <div className="bg-paper relative aspect-[4/3] w-full">
                  <Image
                    src={p.thumbnailUrl || p.imageUrl}
                    alt={p.altText}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 300px"
                  />
                  {p.isCover && (
                    <span className="bg-brand absolute top-2 left-2 inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold text-white shadow">
                      <Star className="size-3 fill-white" /> Cover
                    </span>
                  )}
                </div>

                {/* Details & controls */}
                <div className="flex flex-1 flex-col justify-between p-3">
                  {editingId === p.id ? (
                    <div className="space-y-2">
                      <Input
                        type="text"
                        value={editAlt}
                        onChange={(e) => setEditAlt(e.target.value)}
                        placeholder="Alt text"
                        className="h-7 text-xs"
                      />
                      <Input
                        type="text"
                        value={editCaption}
                        onChange={(e) => setEditCaption(e.target.value)}
                        placeholder="Caption"
                        className="h-7 text-xs"
                      />
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          disabled={isUpdating}
                          onClick={() => handleSaveEdit(p.id)}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-foreground line-clamp-2 text-xs font-medium">
                        {p.altText}
                      </p>
                      {p.caption && (
                        <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs italic">
                          {p.caption}
                        </p>
                      )}
                      <Button
                        type="button"
                        variant="link"
                        size="xs"
                        onClick={() => {
                          setEditingId(p.id);
                          setEditAlt(p.altText);
                          setEditCaption(p.caption || '');
                        }}
                        className="h-auto p-0 text-xs"
                      >
                        Edit text
                      </Button>
                    </div>
                  )}

                  <div className="border-line mt-3 flex items-center justify-between border-t pt-2">
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleMove(idx, 'up')}
                        disabled={idx === 0}
                        aria-label="Move earlier"
                      >
                        <ArrowUp className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleMove(idx, 'down')}
                        disabled={idx === photos.length - 1}
                        aria-label="Move later"
                      >
                        <ArrowDown className="size-3.5" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-1">
                      {!p.isCover && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleSetCover(p)}
                          aria-label="Set as cover"
                          title="Set as cover"
                        >
                          <Star className="size-3.5" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleDelete(p.id)}
                        aria-label="Delete photo"
                        title="Delete photo"
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
