import type { ChatMessage } from '../llm/llm.service.js';
import type { ChatRequest, ChatSource } from './chat.dto.js';

export const NO_CONTEXT_ANSWER =
  "I couldn't find anything about that in your documents.";

const SYSTEM_PROMPT = `You are an assistant that answers questions about the user's documents.
Rules:
- Answer ONLY using the numbered context passages below.
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

  // Context goes in the system message and the question stays on its own:
  // with history present, llama3.2:3b wrongly answered "I don't know" in
  // 3/8 runs when the context was glued to the question, 0/8 this way.
  return [
    {
      role: 'system',
      content: `${SYSTEM_PROMPT}\n\nContext passages for the latest question:\n${context}`,
    },
    ...history.slice(-MAX_HISTORY_MESSAGES),
    { role: 'user', content: question },
  ];
}
