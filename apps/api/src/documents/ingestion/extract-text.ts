import { extname } from 'node:path';
import { extractText as extractPdfText, getDocumentProxy } from 'unpdf';

export interface PageText {
  /** 1-based page number, or null for formats without pages. */
  page: number | null;
  text: string;
}

export const SUPPORTED_EXTENSIONS = ['.pdf', '.txt', '.md'] as const;

export class UnsupportedFileTypeError extends Error {
  constructor(fileName: string) {
    super(
      `Unsupported file type: ${fileName}. Supported: ${SUPPORTED_EXTENSIONS.join(', ')}`,
    );
  }
}

export async function extractText(
  fileName: string,
  buffer: Buffer,
): Promise<PageText[]> {
  const ext = extname(fileName).toLowerCase();

  if (ext === '.pdf') {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractPdfText(pdf, { mergePages: false });
    return text
      .map((pageText, i) => ({ page: i + 1, text: normalize(pageText) }))
      .filter((p) => p.text.length > 0);
  }

  if (ext === '.txt' || ext === '.md') {
    const text = normalize(buffer.toString('utf8'));
    return text ? [{ page: null, text }] : [];
  }

  throw new UnsupportedFileTypeError(fileName);
}

function normalize(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/(\w)-\n(\w)/g, '$1$2') // re-join words hyphenated across lines
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
