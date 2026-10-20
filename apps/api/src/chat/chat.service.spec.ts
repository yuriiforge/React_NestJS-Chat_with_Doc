import { ConfigService } from '@nestjs/config';
import type { LlmService } from '../llm/llm.service.js';
import type {
  RetrievalService,
  RetrievedChunk,
} from '../retrieval/retrieval.service.js';
import { ChatService } from './chat.service.js';
import { NO_CONTEXT_ANSWER } from './prompt.js';

const chunk = (score: number, page: number): RetrievedChunk => ({
  chunkId: `c${page}`,
  documentId: 'doc-1',
  documentName: 'handbook.pdf',
  page,
  content: `content of page ${page}`,
  score,
});

const collect = async <T>(gen: AsyncIterable<T>): Promise<T[]> => {
  const out: T[] = [];
  for await (const item of gen) out.push(item);
  return out;
};

describe('ChatService', () => {
  const search = vi.fn();
  const chat = vi.fn();
  const chatStream = vi.fn();
  const service = new ChatService(
    { search } as unknown as RetrievalService,
    { chat, chatStream } as unknown as LlmService,
    new ConfigService({ RAG_TOP_K: 3, RAG_MIN_SCORE: 0.5 }),
  );

  beforeEach(() => {
    search.mockReset();
    chat.mockReset();
    chatStream.mockReset();
  });

  it('streams sources, then tokens, then done', async () => {
    search.mockResolvedValue([chunk(0.8, 2)]);
    chatStream.mockImplementation(async function* () {
      yield 'Report ';
      yield 'it [1].';
    });
    const signal = new AbortController().signal;

    const events = await collect(
      service.askStream({ question: 'lost badge?', history: [] }, signal),
    );

    expect(events.map((e) => e.type)).toEqual([
      'sources',
      'token',
      'token',
      'done',
    ]);
    expect(events[1]).toEqual({ type: 'token', text: 'Report ' });
    expect(chatStream.mock.calls[0][1]).toBe(signal);
  });

  it('streams the no-context answer without calling the LLM', async () => {
    search.mockResolvedValue([]);

    const events = await collect(
      service.askStream({ question: 'capital?', history: [] }),
    );

    expect(events).toEqual([
      { type: 'sources', sources: [] },
      { type: 'token', text: NO_CONTEXT_ANSWER },
      { type: 'done' },
    ]);
    expect(chatStream).not.toHaveBeenCalled();
  });

  it('answers from relevant chunks and returns numbered sources', async () => {
    search.mockResolvedValue([chunk(0.8, 2), chunk(0.6, 1), chunk(0.3, 3)]);
    chat.mockResolvedValue('Report it within 24 hours [1].');

    const res = await service.ask({ question: 'lost badge?', history: [] });

    expect(search).toHaveBeenCalledWith('lost badge?', {
      limit: 3,
      documentIds: undefined,
    });
    expect(res.answer).toBe('Report it within 24 hours [1].');
    expect(res.sources.map((s) => [s.n, s.page])).toEqual([
      [1, 2],
      [2, 1],
    ]);
    const prompt = chat.mock.calls[0][0].at(-1).content as string;
    expect(prompt).toContain('[1] (handbook.pdf, page 2)\ncontent of page 2');
    expect(prompt).not.toContain('page 3');
  });

  it('skips the LLM when nothing relevant is found', async () => {
    search.mockResolvedValue([chunk(0.4, 1)]);

    const res = await service.ask({ question: 'capital?', history: [] });

    expect(res).toEqual({ answer: NO_CONTEXT_ANSWER, sources: [] });
    expect(chat).not.toHaveBeenCalled();
  });

  it('sends only the last 6 history messages', async () => {
    search.mockResolvedValue([chunk(0.9, 1)]);
    chat.mockResolvedValue('ok');
    const history = Array.from({ length: 10 }, (_, i) => ({
      role: i % 2 ? ('assistant' as const) : ('user' as const),
      content: `turn ${i}`,
    }));

    await service.ask({ question: 'q', history });

    const messages = chat.mock.calls[0][0];
    expect(messages).toHaveLength(1 + 6 + 1);
    expect(messages[1].content).toBe('turn 4');
  });
});
