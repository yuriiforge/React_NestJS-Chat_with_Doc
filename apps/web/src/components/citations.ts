export type AnswerPart = { type: 'text'; text: string } | { type: 'cite'; n: number }

const CITATION = /\[(\d+)\]/g

/** Splits an answer into text and `[n]` citation parts for known source numbers. */
export function splitCitations(answer: string, known: Set<number>): AnswerPart[] {
  const parts: AnswerPart[] = []
  let last = 0
  for (const match of answer.matchAll(CITATION)) {
    const n = Number(match[1])
    if (!known.has(n)) continue
    if (match.index > last) parts.push({ type: 'text', text: answer.slice(last, match.index) })
    parts.push({ type: 'cite', n })
    last = match.index + match[0].length
  }
  if (last < answer.length) parts.push({ type: 'text', text: answer.slice(last) })
  return parts
}

/** Source numbers in the order they are first cited. */
export function citedNumbers(answer: string, known: Set<number>): number[] {
  const seen = new Set<number>()
  for (const match of answer.matchAll(CITATION)) {
    const n = Number(match[1])
    if (known.has(n)) seen.add(n)
  }
  return [...seen]
}
