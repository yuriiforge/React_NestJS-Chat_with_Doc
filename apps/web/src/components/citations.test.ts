import { describe, expect, it } from 'vitest'
import { citedNumbers, splitCitations } from './citations'

const known = new Set([1, 2])

describe('splitCitations', () => {
  it('turns known [n] markers into citation parts', () => {
    expect(splitCitations('Report it [2] within 24h [1][2].', known)).toEqual([
      { type: 'text', text: 'Report it ' },
      { type: 'cite', n: 2 },
      { type: 'text', text: ' within 24h ' },
      { type: 'cite', n: 1 },
      { type: 'cite', n: 2 },
      { type: 'text', text: '.' },
    ])
  })

  it('leaves unknown numbers as text', () => {
    expect(splitCitations('See [7].', known)).toEqual([{ type: 'text', text: 'See [7].' }])
  })
})

describe('citedNumbers', () => {
  it('returns known numbers once, in citation order', () => {
    expect(citedNumbers('[2] then [1], again [2] and [9]', known)).toEqual([2, 1])
  })
})
