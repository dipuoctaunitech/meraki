"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2, Video, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  type DressCategoryId
} from "@/lib/categories";
import { useDressCategories } from "@/hooks/useDressCategories";
import {
  createDressId,
  fetchDressById,
  fileToDataUrl,
  saveUploadedDress,
  type Dress
} from "@/lib/dresses";
import {
  getUploadLimitMessage,
  isWithinUploadLimit,
  MAX_UPLOAD_SIZE_BYTES,
  formatUploadSize
} from "@/lib/upload-limits";

type MediaFile = {
  id: string;
  url: string;
  type: "image" | "video";
  name: string;
  file?: File;
};

function mediaFromDataUrls(urls: string[], type: "image" | "video"): MediaFile[] {
  return urls.map((url, index) => ({
    id: createMediaId(),
    url,
    type,
    name: type === "image" ? `Image ${index + 1}` : `Video ${index + 1}`
  }));
}

function isImageFile(file: File) {
  return (
    file.type.startsWith("image/") ||
    /\.(jpe?g|png|gif|webp|heic|heif|bmp|svg)$/i.test(file.name)
  );
}

function isVideoFile(file: File) {
  return (
    file.type.startsWith("video/") ||
    /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(file.name)
  );
}

function createMediaId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `media-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createMediaFile(file: File, type: "image" | "video"): MediaFile {
  return {
    id: createMediaId(),
    file,
    url: URL.createObjectURL(file),
    type,
    name: file.name
  };
}

function revokeMediaFiles(files: MediaFile[]) {
  files.forEach((file) => {
    if (file.file) {
      URL.revokeObjectURL(file.url);
    }
  });
}

async function mediaToDataUrl(media: MediaFile): Promise<string> {
  if (media.file) {
    return fileToDataUrl(media.file);
  }
  return media.url;
}

const imageUploadButtonClassName =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-medium text-white transition hover:opacity-90";

const mediaDropzoneClassName =
  "mt-4 flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-champagne/60 text-neutral-600 transition hover:border-ink hover:text-ink";

type UploadDressFormProps = {
  category: DressCategoryId;
  editId?: string | null;
};

export function UploadDressForm({
  category,
  editId = null
}: UploadDressFormProps) {
  const router = useRouter();
  const { getCategoryById } = useDressCategories();
  const mediaFilesRef = useRef<MediaFile[]>([]);

  const [editingDressId, setEditingDressId] = useState<string | null>(editId);
  const [loadingDress, setLoadingDress] = useState(Boolean(editId));
  const [name, setName] = useState("");
  const [showPrice, setShowPrice] = useState(true);
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [size, setSize] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [images, setImages] = useState<MediaFile[]>([]);
  const [videos, setVideos] = useState<MediaFile[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    mediaFilesRef.current = [...images, ...videos];
  }, [images, videos]);

  useEffect(() => {
    return () => {
      revokeMediaFiles(mediaFilesRef.current);
    };
  }, []);

  useEffect(() => {
    if (!editId) {
      setLoadingDress(false);
      return;
    }

    const dressId = editId;
    let active = true;

    async function loadDress() {
      setLoadingDress(true);
      const dress = await fetchDressById(dressId);
      if (!active) return;

      if (!dress) {
        setLoadingDress(false);
        return;
      }

      applyDressToForm(dress);
      setEditingDressId(dress.id);
      setSubmitted(false);
      setLoadingDress(false);
    }

    void loadDress();

    return () => {
      active = false;
    };
  }, [editId]);

  function applyDressToForm(dress: Dress) {
    revokeMediaFiles(images);
    revokeMediaFiles(videos);
    setName(dress.name);
    setShowPrice(dress.showPrice);
    setPrice(dress.price);
    setDescription(dress.description);
    setSize(dress.size);
    setDimensions(dress.dimensions);
    setImages(mediaFromDataUrls(dress.imageUrls ?? [], "image"));
    setVideos(mediaFromDataUrls(dress.videoUrls ?? [], "video"));
  }

  function filterValidFiles(files: FileList | null, type: "image" | "video") {
    if (!files) return [];

    const matcher = type === "image" ? isImageFile : isVideoFile;
    const accepted: File[] = [];

    for (const file of Array.from(files)) {
      if (!matcher(file)) continue;
      if (!isWithinUploadLimit(file)) {
        window.alert(getUploadLimitMessage(file));
        continue;
      }
      accepted.push(file);
    }

    return accepted;
  }

  function handleAddImages(files: FileList | null) {
    const next = filterValidFiles(files, "image").map((file) =>
      createMediaFile(file, "image")
    );
    if (next.length === 0) return;
    setImages((current) => [...current, ...next]);
  }

  function handleAddVideos(files: FileList | null) {
    const next = filterValidFiles(files, "video").map((file) =>
      createMediaFile(file, "video")
    );
    if (next.length === 0) return;
    setVideos((current) => [...current, ...next]);
  }

  function removeImage(id: string) {
    setImages((current) => {
      const target = current.find((file) => file.id === id);
      if (target?.file) URL.revokeObjectURL(target.url);
      return current.filter((file) => file.id !== id);
    });
  }

  function removeVideo(id: string) {
    setVideos((current) => {
      const target = current.find((file) => file.id === id);
      if (target?.file) URL.revokeObjectURL(target.url);
      return current.filter((file) => file.id !== id);
    });
  }

  function resetForm() {
    revokeMediaFiles(images);
    revokeMediaFiles(videos);
    setEditingDressId(null);
    setName("");
    setShowPrice(true);
    setPrice("");
    setDescription("");
    setSize("");
    setDimensions("");
    setImages([]);
    setVideos([]);
    setSubmitted(false);
    router.replace(`/upload/${category}`, { scroll: false });
  }

  function handleEditSavedDress() {
    setSubmitted(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || saving) return;

    setSaving(true);
    try {
      const oversized = [...images, ...videos].find(
        (media) => media.file && !isWithinUploadLimit(media.file)
      );
      if (oversized?.file) {
        window.alert(getUploadLimitMessage(oversized.file));
        return;
      }

      const imageUrls = await Promise.all(images.map(mediaToDataUrl));
      const videoUrls = await Promise.all(videos.map(mediaToDataUrl));

      const dressId = editingDressId ?? createDressId();
      const dress: Dress = {
        id: dressId,
        category,
        name: name.trim(),
        showPrice,
        price,
        description: description.trim(),
        size: size.trim(),
        dimensions: dimensions.trim(),
        imageUrls,
        videoUrls
      };

      await saveUploadedDress(dress);
      setEditingDressId(dressId);
      router.replace(`/upload/${category}?edit=${dressId}`, { scroll: false });
      setSubmitted(true);
    } catch {
      window.alert(
        "Could not save this dress. Try fewer or smaller photos and videos."
      );
    } finally {
      setSaving(false);
    }
  }

  const selectedLabel = getCategoryById(category)?.label ?? category;
  const isEditing = Boolean(editingDressId);

  if (loadingDress) {
    return (
      <div className="h-96 animate-pulse rounded-3xl bg-neutral-200" />
    );
  }

  return (
    <div className="space-y-10">
      {!submitted && (
        <form onSubmit={handleSubmit} className="space-y-8">
          <Card className="space-y-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-sand">
                  {selectedLabel}
                </p>
                <h2 className="mt-2 font-serif text-2xl text-ink">
                  {isEditing ? "Edit dress" : "Add dress"}
                </h2>
              </div>
              <Link
                href="/upload"
                className="rounded-full p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-ink"
                aria-label="Change category"
              >
                <X className="h-5 w-5" />
              </Link>
            </div>

            <div className="grid gap-8 xl:grid-cols-[1fr_320px]">
              <div className="grid gap-8 lg:grid-cols-2">
              <div className="space-y-6">
                <div>
                  <label
                    htmlFor="dress-name"
                    className="block text-sm font-medium text-ink"
                  >
                    Name
                  </label>
                  <p className="mt-1 text-xs text-neutral-500">
                    Enter the dress name in bold italics.
                  </p>
                  <input
                    id="dress-name"
                    type="text"
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Silk Evening Gown"
                    className="mt-3 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 font-serif text-2xl font-bold italic text-ink outline-none transition placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:not-italic placeholder:text-neutral-400 focus:border-ink"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-3 text-sm font-medium text-ink">
                    <input
                      type="checkbox"
                      checked={showPrice}
                      onChange={(event) => setShowPrice(event.target.checked)}
                      className="h-4 w-4 rounded border-neutral-300 text-ink focus:ring-ink"
                    />
                    Display price
                  </label>
                  {showPrice && (
                    <div className="mt-3">
                      <label htmlFor="dress-price" className="sr-only">
                        Price
                      </label>
                      <input
                        id="dress-price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={price}
                        onChange={(event) => setPrice(event.target.value)}
                        placeholder="0.00"
                        className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-ink"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="dress-description"
                    className="block text-sm font-medium text-ink"
                  >
                    Description
                  </label>
                  <textarea
                    id="dress-description"
                    rows={4}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Describe the fabric, fit, and occasion..."
                    className="mt-3 w-full resize-y rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-ink"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="dress-size"
                      className="block text-sm font-medium text-ink"
                    >
                      Size
                    </label>
                    <input
                      id="dress-size"
                      type="text"
                      value={size}
                      onChange={(event) => setSize(event.target.value)}
                      placeholder="e.g. S, M, L or 8"
                      className="mt-3 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-ink"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="dress-dimensions"
                      className="block text-sm font-medium text-ink"
                    >
                      Dimensions
                    </label>
                    <input
                      id="dress-dimensions"
                      type="text"
                      value={dimensions}
                      onChange={(event) => setDimensions(event.target.value)}
                      placeholder='e.g. Bust 34", Waist 28", Length 58"'
                      className="mt-3 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-ink"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-ink">Images</p>
                      <p className="mt-1 text-xs text-neutral-500">
                        Up to {formatUploadSize(MAX_UPLOAD_SIZE_BYTES)} per file
                      </p>
                    </div>
                    <label
                      htmlFor="dress-image-upload"
                      className={imageUploadButtonClassName}
                    >
                      <ImagePlus className="h-4 w-4" />
                      Upload images
                    </label>
                  </div>
                  <input
                    id="dress-image-upload"
                    type="file"
                    accept="image/*,.heic,.heif"
                    multiple
                    className="sr-only"
                    onChange={(event) => {
                      handleAddImages(event.target.files);
                      event.target.value = "";
                    }}
                  />
                  {images.length === 0 ? (
                    <label
                      htmlFor="dress-image-upload"
                      className={`${mediaDropzoneClassName} min-h-40`}
                    >
                      <ImagePlus className="h-8 w-8" />
                      <span className="mt-3 text-sm">Add dress photos</span>
                    </label>
                  ) : (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {images.map((image) => (
                        <div
                          key={image.id}
                          className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-neutral-100"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={image.url}
                            alt={image.name}
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(image.id)}
                            className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-neutral-600 opacity-0 transition group-hover:opacity-100"
                            aria-label={`Remove ${image.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-ink">Videos</p>
                      <p className="mt-1 text-xs text-neutral-500">
                        Up to {formatUploadSize(MAX_UPLOAD_SIZE_BYTES)} per file
                      </p>
                    </div>
                    <label
                      htmlFor="dress-video-upload"
                      className={imageUploadButtonClassName}
                    >
                      <Video className="h-4 w-4" />
                      Upload videos
                    </label>
                  </div>
                  <input
                    id="dress-video-upload"
                    type="file"
                    accept="video/*,.mov,.m4v"
                    multiple
                    className="sr-only"
                    onChange={(event) => {
                      handleAddVideos(event.target.files);
                      event.target.value = "";
                    }}
                  />
                  {videos.length === 0 ? (
                    <label
                      htmlFor="dress-video-upload"
                      className={`${mediaDropzoneClassName} min-h-32`}
                    >
                      <Video className="h-8 w-8" />
                      <span className="mt-3 text-sm">Add dress videos</span>
                    </label>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {videos.map((video) => (
                        <div
                          key={video.id}
                          className="group relative overflow-hidden rounded-2xl bg-neutral-900"
                        >
                          <video
                            src={video.url}
                            controls
                            className="max-h-64 w-full"
                          />
                          <button
                            type="button"
                            onClick={() => removeVideo(video.id)}
                            className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-neutral-600"
                            aria-label={`Remove ${video.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <p className="truncate px-3 py-2 text-xs text-neutral-300">
                            {video.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              </div>

              <aside className="xl:sticky xl:top-8 xl:self-start">
                <p className="text-xs uppercase tracking-[0.24em] text-sand">
                  Preview
                </p>
                <Card className="mt-3 overflow-hidden p-0">
                  <div className="relative aspect-[3/4] bg-neutral-100">
                    {images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={images[0].url}
                        alt={name || "Dress preview"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center text-neutral-400">
                        <ImagePlus className="h-10 w-10" />
                        <span className="mt-2 text-sm">No image yet</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-sand">
                      {selectedLabel}
                    </p>
                    <h3 className="font-serif text-xl font-bold italic text-ink">
                      {name.trim() || "Dress name"}
                    </h3>
                    {showPrice && price && (
                      <p className="text-lg font-medium text-ink">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD"
                        }).format(Number(price))}
                      </p>
                    )}
                    {description && (
                      <p className="text-sm leading-relaxed text-neutral-600">
                        {description}
                      </p>
                    )}
                    {(size || dimensions) && (
                      <div className="space-y-1 border-t border-neutral-200 pt-3 text-sm text-neutral-600">
                        {size && <p>Size: {size}</p>}
                        {dimensions && <p>Dimensions: {dimensions}</p>}
                      </div>
                    )}
                    {videos.length > 0 && (
                      <p className="text-xs text-neutral-500">
                        {videos.length} video{videos.length === 1 ? "" : "s"}{" "}
                        attached
                      </p>
                    )}
                  </div>
                </Card>
              </aside>
            </div>

            <div className="flex flex-wrap gap-3 border-t border-neutral-200 pt-6">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : isEditing ? "Update dress" : "Save dress"}
              </Button>
              <Button
                type="button"
                className="border border-ink bg-transparent text-ink hover:bg-ink hover:text-white"
                onClick={resetForm}
              >
                {isEditing ? "Start new dress" : "Cancel"}
              </Button>
            </div>
          </Card>
        </form>
      )}

      {submitted && (
        <Card className="text-center">
          <p className="font-serif text-2xl font-bold italic text-ink">
            {name}
          </p>
          <p className="mt-3 text-neutral-600">
            Your {selectedLabel.toLowerCase()} dress has been{" "}
            {isEditing ? "updated" : "saved"}.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button type="button" onClick={resetForm}>
              Add another dress
            </Button>
            <Link href="/collection">
              <Button className="border border-ink bg-transparent text-ink hover:bg-ink hover:text-white">
                View collection
              </Button>
            </Link>
            <Button
              type="button"
              className="border border-ink bg-transparent text-ink hover:bg-ink hover:text-white"
              onClick={handleEditSavedDress}
            >
              Edit details
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
