import { TextSegment } from '@/types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { DEFAULT_VOICE, voiceOptions } from './constants';

// File validation constants
const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const PDF_MIME_TYPE = 'application/pdf';


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Serialize Mongoose documents to plain JSON objects (strips ObjectId, Date, etc.)
export const serializeData = <T>(data: T): T => JSON.parse(JSON.stringify(data));

// Auto generate slug
export function generateSlug(text: string): string {
  return text
    .replace(/\.[^/.]+$/, '') // Remove file extension (.pdf, .txt, etc.)
    .toLowerCase() // Convert to lowercase
    .trim() // Remove whitespace from both ends
    .replace(/[^\w\s-]/g, '') // Remove special characters (keep letters, numbers, spaces, hyphens)
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

// Escape regex special characters to prevent ReDoS attacks
export const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Splits text content into segments for MongoDB storage and search
export const splitIntoSegments = (
  text: string,
  segmentSize: number = 500, // Maximum words per segment
  overlapSize: number = 50, // Words to overlap between segments for context
): TextSegment[] => {
  // Validate parameters to prevent infinite loops
  if (segmentSize <= 0) {
    throw new Error('segmentSize must be greater than 0');
  }
  if (overlapSize < 0 || overlapSize >= segmentSize) {
    throw new Error('overlapSize must be >= 0 and < segmentSize');
  }

  const words = text.split(/\s+/).filter((word) => word.length > 0);
  const segments: TextSegment[] = [];

  let segmentIndex = 0;
  let startIndex = 0;

  while (startIndex < words.length) {
    const endIndex = Math.min(startIndex + segmentSize, words.length);
    const segmentWords = words.slice(startIndex, endIndex);
    const segmentText = segmentWords.join(' ');

    segments.push({
      text: segmentText,
      segmentIndex,
      wordCount: segmentWords.length,
    });

    segmentIndex++;

    if (endIndex >= words.length) break;
    startIndex = endIndex - overlapSize;
  }

  return segments;
};

// Get voice data by persona key or voice ID
export const getVoice = (persona?: string) => {
  if (!persona) return voiceOptions[DEFAULT_VOICE];

  // Find by voice ID
  const voiceEntry = Object.values(voiceOptions).find((v) => v.id === persona);
  if (voiceEntry) return voiceEntry;

  // Find by key
  const voiceByKey = voiceOptions[persona as keyof typeof voiceOptions];
  if (voiceByKey) return voiceByKey;

  // Default fallback
  return voiceOptions[DEFAULT_VOICE];
};

// Format duration in seconds to MM:SS format
export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export async function parsePDFFile(file: File) {
  try {
    const pdfjsLib = await import('pdfjs-dist');

    if (typeof window !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url,
      ).toString();
    }

    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();

    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDocument = await loadingTask.promise;

    // Render first page as cover image
    const firstPage = await pdfDocument.getPage(1);
    const viewport = firstPage.getViewport({ scale: 2 }); // 2x scale for better quality

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Could not get canvas context');
    }

    await firstPage.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    // Convert canvas to data URL
    const coverDataURL = canvas.toDataURL('image/png');

    // Extract text from all pages
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .filter((item) => 'str' in item)
        .map((item) => (item as { str: string }).str)
        .join(' ');
      fullText += pageText + '\n';
    }

    // Split text into segments for search
    const segments = splitIntoSegments(fullText);

    // Clean up PDF document resources
    await pdfDocument.destroy();

    return {
      content: segments,
      cover: coverDataURL,
    };
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error(`Failed to parse PDF file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Validates a PDF file
 * Checks for file existence, type, and size constraints
 * @param file - The file to validate
 * @returns Object with isValid flag and error message if invalid
 */
export const validatePDFFile = (file: File | null | undefined): { isValid: boolean; error?: string } => {
  if (!file) {
    return { isValid: false, error: 'PDF file is required' };
  }

  // Check file type
  if (file.type !== PDF_MIME_TYPE) {
    return { isValid: false, error: 'File must be a PDF (application/pdf)' };
  }

  // Check file extension
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return { isValid: false, error: 'File must have a .pdf extension' };
  }

  // Check file size
  if (file.size > MAX_PDF_SIZE) {
    return {
      isValid: false,
      error: `PDF file is too large. Maximum size is ${MAX_PDF_SIZE / (1024 * 1024)}MB`,
    };
  }

  // Check minimum file size (at least 1KB to avoid empty files)
  if (file.size < 1024) {
    return { isValid: false, error: 'PDF file is too small or empty' };
  }

  return { isValid: true };
};

/**
 * Validates a cover image file
 * Checks for file type and size constraints (optional field)
 * @param file - The file to validate (can be null for optional field)
 * @returns Object with isValid flag and error message if invalid
 */
export const validateCoverImage = (file: File | null | undefined): { isValid: boolean; error?: string } => {
  // Cover image is optional, so null/undefined is valid
  if (!file) {
    return { isValid: true };
  }

  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: `Cover image must be one of: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
    };
  }

  // Check file size
  if (file.size > MAX_IMAGE_SIZE) {
    return {
      isValid: false,
      error: `Cover image is too large. Maximum size is ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`,
    };
  }

  // Check minimum file size (at least 1KB)
  if (file.size < 1024) {
    return { isValid: false, error: 'Cover image file is too small' };
  }

  return { isValid: true };
};
