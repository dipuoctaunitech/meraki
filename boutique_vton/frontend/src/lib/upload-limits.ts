export const MAX_UPLOAD_SIZE_BYTES = 100 * 1024 * 1024;

export function formatUploadSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${bytes} B`;
}

export function isWithinUploadLimit(file: File): boolean {
  return file.size <= MAX_UPLOAD_SIZE_BYTES;
}

export function getUploadLimitMessage(file: File): string {
  return `"${file.name}" is ${formatUploadSize(file.size)}. Each file must be 100 MB or smaller.`;
}
