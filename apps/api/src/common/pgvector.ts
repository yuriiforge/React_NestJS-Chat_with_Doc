/** Serializes a vector to pgvector's text format, e.g. `[0.1,0.2]`. */
export function toPgVector(vector: number[]): string {
  return `[${vector.join(',')}]`;
}
