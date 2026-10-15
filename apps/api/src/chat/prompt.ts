import type { ChatMessage } from '../llm/llm.service.js';
import type { ChatRequest, ChatSource } from './chat.dto.js';

export const NO_CONTEXT_ANSWER =
  "I couldn't find anything about that in your documents.";

const SYSTEM_PROMPT = `You are an assistant that answers questions about the user's documents.
Rules:
- Answer ONLY using the numbered context passages provided with the question.
- Cite the passages you used with their numbers in square brackets, e.g. [1] or [2][3].
- If the context does not contain the answer, say you don't know based on the documents. Never make up facts.
- Be concise and answer in the same language as the question.`;

/** How many previous turns are sent to the model. */
const MAX_HISTORY_MESSAGES = 6;

export function buildMessages(
  question: string,
  sources: ChatSource[],
  history: ChatRequest['history'] = [],
): ChatMessage[] {
  const context = sources
    .map((s) => {
      const where = s.page
        ? `${s.documentName}, page ${s.page}`
        : s.documentName;
      return `[${s.n}] (${where})\n${s.content}`;
    })
    .join('\n\n');

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-MAX_HISTORY_MESSAGES),
    { role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` },
  ];
}
