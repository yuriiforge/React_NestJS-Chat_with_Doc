export interface SseMessage {
  event: string
  data: string
}

/**
 * Parses a Server-Sent Events body. Used instead of EventSource because the
 * chat stream is a POST request.
 */
export async function* parseSse(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<SseMessage> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n?/g, '\n')

      let end: number
      while ((end = buffer.indexOf('\n\n')) !== -1) {
        const message = parseMessage(buffer.slice(0, end))
        buffer = buffer.slice(end + 2)
        if (message) yield message
      }
    }
    const last = parseMessage(buffer)
    if (last) yield last
  } finally {
    reader.releaseLock()
  }
}

function parseMessage(block: string): SseMessage | null {
  let event = 'message'
  const data: string[] = []
  for (const line of block.split('\n')) {
    if (line.startsWith(':')) continue // comment
    const colon = line.indexOf(':')
    const field = colon === -1 ? line : line.slice(0, colon)
    const value = colon === -1 ? '' : line.slice(colon + 1).replace(/^ /, '')
    if (field === 'event') event = value
    else if (field === 'data') data.push(value)
  }
  return data.length ? { event, data: data.join('\n') } : null
}
