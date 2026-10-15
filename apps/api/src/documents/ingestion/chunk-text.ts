import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import type { PageText } from './extract-text.js';

export interface TextChunk {
  chunkIndex: number;
  page: number | null;
  content: string;
}

export async function chunkPages(
  pages: PageText[],
  { chunkSize = 1000, chunkOverlap = 150 } = {},
): Promise<TextChunk[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
  });
  const chunks: TextChunk[] = [];

  // Split per page so each chunk keeps an exact page reference for citations.
  for (const { page, text } of pages) {
    for (const content of await splitter.splitText(text)) {
      chunks.push({ chunkIndex: chunks.length, page, content });
    }
  }
  return chunks;
}
