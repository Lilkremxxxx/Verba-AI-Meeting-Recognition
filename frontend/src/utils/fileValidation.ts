/**
 * File validation utilities for audio file uploads
 */

const ALLOWED_EXTENSIONS = ['mp3', 'wav'];
const ALLOWED_MIME_TYPES = ['audio/mpeg', 'audio/wav', 'audio/x-wav'];
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

/**
 * Validates an audio file based on extension, MIME type, and size
 * @param file - The file to validate
 * @returns ValidationResult with ok status and optional error message
 */
export function validateAudioFile(file: File): ValidationResult {
  // Check file extension
  const fileName = file.name.toLowerCase();
  const extension = fileName.split('.').pop();
  
  if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      ok: false,
      error: `Invalid file extension. Only ${ALLOWED_EXTENSIONS.join(', ')} files are allowed.`
    };
  }

  // Check MIME type
  const mimeType = file.type.toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      ok: false,
      error: `Invalid file type. Only audio/mpeg and audio/wav MIME types are allowed.`
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const maxSizeMB = MAX_FILE_SIZE / (1024 * 1024);
    return {
      ok: false,
      error: `File size exceeds ${maxSizeMB}MB limit.`
    };
  }

  return { ok: true };
}

/**
 * Formats file size in human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
