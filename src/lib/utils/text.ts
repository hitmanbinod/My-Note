import { JSONContent } from '@tiptap/react';

/**
 * Extract plain text from Tiptap JSON content
 */
export function extractPlainText(content: JSONContent): string {
  if (!content) return '';
  
  let text = '';
  
  if (content.text) {
    text += content.text;
  }
  
  if (content.content && Array.isArray(content.content)) {
    for (const node of content.content) {
      text += extractPlainText(node) + ' ';
    }
  }
  
  return text.trim();
}

/**
 * Truncate text to a specified length
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Count words in text
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Count characters in text
 */
export function countCharacters(text: string): number {
  return text.length;
}

/**
 * Sanitize filename for file system
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9_\-. ]/gi, '_')
    .replace(/\s+/g, '_')
    .substring(0, 200);
}

/**
 * Generate excerpt from text
 */
export function generateExcerpt(text: string, maxLength: number = 150): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  return truncate(cleaned, maxLength);
}
