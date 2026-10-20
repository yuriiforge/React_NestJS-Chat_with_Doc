import { describe, expect, it } from 'vitest'
import { parseSse } from './sse'

function streamOf(...chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })
}

async function collect(stream: ReadableStream<Uint8Array>) {
  const out = []
  for await (const message of parseSse(stream)) out.push(message)
  return out
}

describe('parseSse', () => {
  it('parses named events', async () => {
    const messages = await collect(
      streamOf('event: token\ndata: {"text":"Hi"}\n\nevent: done\ndata: {}\n\n'),
    )
    expect(messages).toEqual([
      { event: 'token', data: '{"text":"Hi"}' },
      { event: 'done', data: '{}' },
    ])
  })

  it('handles messages split across chunks', async () => {
    const messages = await collect(
      streamOf('event: tok', 'en\ndata: {"te', 'xt":"a"}\n', '\nevent: done\ndata: {}\n\n'),
    )
    expect(messages.map((m) => m.event)).toEqual(['token', 'done'])
    expect(messages[0].data).toBe('{"text":"a"}')
  })

  it('handles CRLF, comments, multi-line data and a missing final blank line', async () => {
    const messages = await collect(
      streamOf(': keep-alive\r\n\r\ndata: line 1\r\ndata: line 2\r\n\r\nevent: done\ndata: {}'),
    )
    expect(messages).toEqual([
      { event: 'message', data: 'line 1\nline 2' },
      { event: 'done', data: '{}' },
    ])
  })
})
