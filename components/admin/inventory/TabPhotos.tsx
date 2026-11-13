'use client';

import Image from 'next/image';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  Image as ImageIcon,
  Star,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import type { z } from 'zod';

import { ReorderButtons } from '@/components/admin/ReorderButtons';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm';
import { Field, inputClass } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import {
  useDeleteImage,
  useReorderRoomImages,
  useUpdateImage,
  useUploadRoomImage,
} from '@/hooks/services/admin/use-inventory';
import type { AdminRoomImage } from '@/types/inventory.types';

import { photoEditFormSchema, photoUploadFormSchema } from './form-schemas';

interface TabPhotosProps {
  roomTypeId: string;
  initialPhotos: AdminRoomImage[];
  onRefresh: () => Promise<void>;
}

type PhotoUploadInput = z.input<typeof photoUploadFormSchema>;
type PhotoUploadOutput = z.output<typeof photoUploadFormSchema>;
type PhotoEditInput = z.input<typeof photoEditFormSchema>;
type PhotoEditOutput = z.output<typeof photoEditFormSchema>;

/** Room photo manager: upload, crop/preview, alt text, publish state and ordering. */
export function TabPhotos({
  roomTypeId,
  initialPhotos,
  onRefresh,
}: TabPhotosProps) {
  const confirm = useConfirm();
  const uploadImage = useUploadRoomImage(roomTypeId);
  const updateImage = useUpdateImage(roomTypeId);
  const deleteImage = useDeleteImage(roomTypeId);
  const reorderImages = useReorderRoomImages(roomTypeId);
  const [photos, setPhotos] = useState<AdminRoomImage[]>(initialPhotos);
  const [syncedPhotos, setSyncedPhotos] = useState(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Editing alt text inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  if (initialPhotos !== syncedPhotos) {
    setSyncedPhotos(initialPhotos);
    setPhotos(initialPhotos);
  }

  const uploadForm = useForm<PhotoUploadInput, unknown, PhotoUploadOutput>({
    resolver: zodResolver(photoUploadFormSchema),
    defaultValues: {
      file: null,
      altText: '',
      caption: '',
    },
    mode: 'onBlur',
  });
  const editForm = useForm<PhotoEditInput, unknown, PhotoEditOutput>({
    resolver: zodResolver(photoEditFormSchema),
    defaultValues: {
      altText: '',
      caption: '',
    },
    mode: 'onBlur',
  });

  const pendingFile = useWatch({ control: uploadForm.control, name: 'file' });
  const atMaxPhotos = photos.length >= 8;

  function handleFileSelect(
    event: React.ChangeEvent<HTMLInputElement>,
    onChange: (file: File | null) => void,
  ) {
    setErrorMessage(null);
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage(ERROR_MESSAGES.FILE_TOO_LARGE);
      onChange(null);
      return;
    }

    onChange(file);
    // Suggest default alt text from filename
    uploadForm.setValue(
      'altText',
      file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .trim(),
    );
  }

  async function handleUpload(input: PhotoUploadOutput) {
    if (!input.file) return;

    setUploading(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', input.file);
      formData.append('altText', input.altText.trim());
      formData.append('caption', input.caption.trim());
      formData.append('isCover', photos.length === 0 ? 'true' : 'false');

      await uploadImage.mutateAsync(formData);

      toast.add({ title: SUCCESS_MESSAGES.PHOTO_UPLOADED, type: 'success' });
      uploadForm.reset({ file: null, altText: '', caption: '' });
      await onRefresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : ERROR_MESSAGES.FAILED_TO_UPLOAD_PHOTO,
      );
    } finally {
      setUploading(false);
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
      await reorderImages.mutateAsync(items);
      toast.add({ title: SUCCESS_MESSAGES.PHOTOS_REORDERED, type: 'success' });
    } catch {
      setErrorMessage(ERROR_MESSAGES.FAILED_TO_REORDER_PHOTOS);
      await onRefresh();
    }
  }

  async function handleSetCover(photo: AdminRoomImage) {
    try {
      await updateImage.mutateAsync({
        imageId: photo.id,
        input: {
          altText: photo.altText,
          caption: photo.caption,
          isCover: true,
        },
      });
      toast.add({ title: SUCCESS_MESSAGES.COVER_PHOTO_SET, type: 'success' });
      await onRefresh();
    } catch {
      setErrorMessage(ERROR_MESSAGES.FAILED_TO_SET_COVER_PHOTO);
    }
  }

  async function handleSaveEdit(input: PhotoEditOutput) {
    if (!editingId) return;

    setIsUpdating(true);
    try {
      await updateImage.mutateAsync({
        imageId: editingId,
        input,
      });
      toast.add({ title: SUCCESS_MESSAGES.IMAGE_UPDATED, type: 'success' });
      setEditingId(null);
      await onRefresh();
    } catch {
      setErrorMessage(ERROR_MESSAGES.FAILED_TO_UPDATE_PHOTO_DETAILS);
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDelete(photoId: string) {
    const sure = await confirm({
      title: 'Delete this photo?',
      description: 'The image is removed from the room gallery immediately.',
      confirmLabel: 'Delete photo',
      tone: 'danger',
    });
    if (!sure) return;
    try {
      await deleteImage.mutateAsync(photoId);
      toast.add({ title: SUCCESS_MESSAGES.IMAGE_DELETED, type: 'success' });
      await onRefresh();
    } catch {
      setErrorMessage(ERROR_MESSAGES.FAILED_TO_DELETE_PHOTO);
    }
  }

  return (
    <div className="space-y-6">
      {errorMessage && (
        <Alert
          variant="destructive"
          size="panel"
          className="items-center gap-3"
        >
          <AlertCircle className="size-5 shrink-0" />
          <p className="col-start-2">{errorMessage}</p>
        </Alert>
      )}

      {/* Upload Zone */}
      {!atMaxPhotos ? (
        <div className="rounded-card border-2 border-dashed border-line bg-card p-6 text-center">
          <UploadCloud className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-2 text-small font-medium text-foreground">
            Upload Room Photos (Up to 8 images, JPEG, PNG, or WebP)
          </p>
          <p className="mt-1 text-caption text-muted-foreground">
            Max 10 MB per image. Processed automatically into responsive WebP
            formats with EXIF stripped.
          </p>

          <Controller
            control={uploadForm.control}
            name="file"
            render={({ field }) => (
              <Input
                type="file"
                id="photoUploadInput"
                accept="image/jpeg,image/png,image/webp"
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                onChange={(event) => handleFileSelect(event, field.onChange)}
                className="hidden"
              />
            )}
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
            <form
              onSubmit={uploadForm.handleSubmit(handleUpload)}
              className="mx-auto mt-4 max-w-lg rounded-sm border border-line bg-paper p-4 text-left text-small"
              noValidate
            >
              <p className="text-small font-semibold text-foreground">
                Selected: {pendingFile.name} (
                {(pendingFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>

              <div className="mt-3">
                <Field
                  id="upload-alt-text"
                  label="Alt Text (Required for accessibility & active status) *"
                  error={uploadForm.formState.errors.altText?.message}
                >
                  {(a11y) => (
                    <Input
                      {...a11y}
                      type="text"
                      placeholder="e.g. Spacious king bedroom with ocean-facing balcony"
                      className={inputClass(
                        uploadForm.formState.errors.altText?.message,
                      )}
                      {...uploadForm.register('altText')}
                    />
                  )}
                </Field>
              </div>

              <div className="mt-3">
                <Field
                  id="upload-caption"
                  label="Caption (Optional)"
                  error={uploadForm.formState.errors.caption?.message}
                >
                  {(a11y) => (
                    <Input
                      {...a11y}
                      type="text"
                      placeholder="e.g. Balcony sunset view"
                      className={inputClass(
                        uploadForm.formState.errors.caption?.message,
                      )}
                      {...uploadForm.register('caption')}
                    />
                  )}
                </Field>
              </div>

              {uploading && (
                <p
                  role="status"
                  className="mt-3 flex items-center gap-2 text-caption text-muted-foreground"
                >
                  <Spinner className="size-4 shrink-0" aria-hidden />
                  Uploading {pendingFile?.name ?? 'photo'} and saving it to the
                  gallery.
                </p>
              )}

              <div className="mt-4 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    uploadForm.reset({ file: null, altText: '', caption: '' })
                  }
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" loading={uploading}>
                  Upload Photo
                </Button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <Alert variant="neutral" size="panel">
          <AlertDescription>
            Maximum of 8 photos reached. Delete an existing photo to upload a
            new one.
          </AlertDescription>
        </Alert>
      )}

      {/* Photos Grid / List */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">
            Current Photos ({photos.length} of 8)
          </h3>
          <p className="text-caption text-muted-foreground">
            First photo or photo marked with ★ is used as the cover on listings.
          </p>
        </div>

        {photos.length === 0 ? (
          <div className="mt-4 rounded-card border border-line bg-paper p-8 text-center text-muted-foreground">
            <ImageIcon className="mx-auto size-8 opacity-40" />
            <p className="mt-2 text-small">
              No photos uploaded for this room type yet.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {photos.map((p, idx) => (
              <div
                key={p.id}
                className={`relative flex flex-col overflow-hidden rounded-card border ${
                  p.isCover
                    ? 'border-primary ring-1 ring-primary'
                    : 'border-line'
                } bg-card`}
              >
                {/* Image display */}
                <div className="relative aspect-4/3 w-full bg-paper">
                  <Image
                    src={p.thumbnailUrl || p.imageUrl}
                    alt={p.altText}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 300px"
                  />
                  {p.isCover && (
                    <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-sm bg-primary px-2 py-0.5 text-caption font-semibold text-primary-foreground shadow-raised">
                      <Star className="size-3 fill-white" /> Cover
                    </span>
                  )}
                </div>

                {/* Details & controls */}
                <div className="flex flex-1 flex-col justify-between p-3">
                  {editingId === p.id ? (
                    <form
                      onSubmit={editForm.handleSubmit(handleSaveEdit)}
                      className="space-y-2"
                      noValidate
                    >
                      <Input
                        type="text"
                        placeholder="Alt text"
                        className="h-7 text-caption"
                        {...editForm.register('altText')}
                      />
                      {editForm.formState.errors.altText?.message && (
                        <p className="text-caption text-destructive">
                          {editForm.formState.errors.altText.message}
                        </p>
                      )}
                      <Input
                        type="text"
                        placeholder="Caption"
                        className="h-7 text-caption"
                        {...editForm.register('caption')}
                      />
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" size="sm" disabled={isUpdating}>
                          Save
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div>
                      <p className="line-clamp-2 text-caption font-medium text-foreground">
                        {p.altText}
                      </p>
                      {p.caption && (
                        <p className="mt-0.5 line-clamp-1 text-caption text-muted-foreground italic">
                          {p.caption}
                        </p>
                      )}
                      <Button
                        type="button"
                        variant="link"
                        size="xs"
                        onClick={() => {
                          setEditingId(p.id);
                          editForm.reset({
                            altText: p.altText,
                            caption: p.caption || '',
                          });
                        }}
                        className="h-auto p-0 text-caption"
                      >
                        Edit text
                      </Button>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between border-t border-line pt-2">
                    <ReorderButtons
                      label={`photo ${idx + 1}`}
                      index={idx}
                      count={photos.length}
                      words={['earlier', 'later']}
                      onMove={(direction) => handleMove(idx, direction)}
                    />

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
