import { readFile } from 'node:fs/promises';
import { chunkPages } from './chunk-text.js';
import { extractText, UnsupportedFileTypeError } from './extract-text.js';

describe('extractText', () => {
  it('normalizes plain text files', async () => {
    const pages = await extractText(
      'notes.txt',
      Buffer.from('Hello   world\r\nsplit hyph-\nenated\n\n\n\nend'),
    );
    expect(pages).toEqual([
      { page: null, text: 'Hello world\nsplit hyphenated\n\nend' },
    ]);
  });

  it('returns no pages for empty files', async () => {
    await expect(extractText('empty.md', Buffer.from(' \n '))).resolves.toEqual(
      [],
    );
  });

  it('rejects unsupported types', async () => {
    await expect(extractText('image.png', Buffer.alloc(1))).rejects.toThrow(
      UnsupportedFileTypeError,
    );
  });
});

describe('chunkPages', () => {
  it('splits per page, keeps page numbers and numbers chunks globally', async () => {
    const chunks = await chunkPages(
      [
        { page: 1, text: 'alpha '.repeat(30) },
        { page: 2, text: 'beta' },
      ],
      { chunkSize: 100, chunkOverlap: 10 },
    );

    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks.every((c) => c.content.length <= 100)).toBe(true);
    expect(chunks.map((c) => c.chunkIndex)).toEqual(chunks.map((_, i) => i));
    expect(chunks.at(-1)).toMatchObject({ page: 2, content: 'beta' });
  });
});

describe('extractText (pdf)', () => {
  it('extracts text per page', async () => {
    const buffer = await readFile(
      new URL('../../../test/fixtures/handbook.pdf', import.meta.url),
    );
    const pages = await extractText('handbook.pdf', buffer);

    expect(pages.map((p) => p.page)).toEqual([1, 2]);
    expect(pages[0].text).toContain('24 days of paid vacation');
    expect(pages[1].text).toContain('Badges must be worn');
  });
});
