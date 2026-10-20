import { ConfigService } from '@nestjs/config';
import type { Ollama } from 'ollama';
import { LlmService } from './llm.service.js';

describe('LlmService', () => {
  const embed = vi.fn();
  const service = new LlmService(
    { embed } as unknown as Ollama,
    new ConfigService({ OLLAMA_EMBED_MODEL: 'embed-model' }),
  );

  beforeEach(() => {
    embed.mockReset();
  });

  it('prefixes documents and embeds them in batches of 32', async () => {
    embed.mockImplementation(({ input }: { input: string[] }) =>
      Promise.resolve({ embeddings: input.map(() => [0.1]) }),
    );
    const texts = Array.from({ length: 40 }, (_, i) => `chunk ${i}`);

    const vectors = await service.embedDocuments(texts);

    expect(vectors).toHaveLength(40);
    expect(embed).toHaveBeenCalledTimes(2);
    expect(embed.mock.calls[0][0].input[0]).toBe('search_document: chunk 0');
    expect(embed.mock.calls[1][0].input).toHaveLength(8);
  });

  it('prefixes queries', async () => {
    embed.mockResolvedValue({ embeddings: [[0.5, 0.5]] });

    await expect(service.embedQuery('what?')).resolves.toEqual([0.5, 0.5]);
    expect(embed).toHaveBeenCalledWith({
      model: 'embed-model',
      input: 'search_query: what?',
    });
  });
});
