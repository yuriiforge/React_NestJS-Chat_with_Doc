# Chat with your docs

Ask questions about your PDF, text and Markdown files. Runs fully locally and for free:
[Ollama](https://ollama.com) for the LLM and embeddings, Postgres + pgvector for search.

```
apps/api   NestJS backend (ingestion, retrieval, chat)
apps/web   React (Vite) frontend
```

## Prerequisites

- Node.js 22+ and pnpm
- Docker Desktop
- Ollama, with the models pulled:
  ```sh
  ollama pull nomic-embed-text
  ollama pull llama3.2:3b
  ```

## Getting started

```sh
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm db:up        # Postgres + pgvector on :5432, schema from apps/api/db/init.sql
pnpm dev          # api on :3000, web on :5173
```

`pnpm db:reset` wipes the database volume and recreates the schema.

## Configuration (`apps/api/.env`)

| Variable             | Default            | Notes                                                 |
| -------------------- | ------------------ | ----------------------------------------------------- |
| `DATABASE_URL`       | —                  | required                                              |
| `OLLAMA_HOST`        | `http://localhost:11434` |                                                 |
| `OLLAMA_CHAT_MODEL`  | `llama3.2:3b`      | any Ollama chat model, e.g. `qwen2.5:7b` for better answers on a stronger machine |
| `OLLAMA_EMBED_MODEL` | `nomic-embed-text` | changing it requires matching `vector(768)` in the schema and re-ingesting |
| `RAG_TOP_K`          | `5`                | chunks sent to the LLM                                |
| `RAG_MIN_SCORE`      | `0.5`              | min cosine similarity for a chunk to count as relevant |

## API

All routes are prefixed with `/api`.

| Method & path         | Description                                                     |
| --------------------- | --------------------------------------------------------------- |
| `GET /health`         | Checks the database connection                                  |
| `POST /documents`     | Multipart upload, field `file` (`.pdf`, `.txt`, `.md`, ≤ 20 MB) |
| `GET /documents`      | List documents with chunk counts                                |
| `GET /documents/:id`  | One document                                                    |
| `DELETE /documents/:id` | Delete a document and its chunks                              |
| `GET /search?q=&limit=` | Raw vector search, useful for debugging retrieval             |
| `POST /chat`          | `{ question, history?, documentIds? }` → `{ answer, sources }`  |
| `POST /chat/stream`   | Same body, answer streamed as Server-Sent Events                |

Stream events: `sources` (`{ sources }`), then `token` (`{ text }`) repeatedly, then `done`,
or `error` (`{ message }`). Answers cite sources as `[n]`, matching `sources[].n`.

```sh
curl -F file=@handbook.pdf localhost:3000/api/documents
curl -N localhost:3000/api/chat/stream -H 'content-type: application/json' \
  -d '{"question":"How many vacation days do I get?"}'
```

## How it works

1. **Ingest**: extract text per page (unpdf) → split into ~1000-char chunks with 150 overlap →
   embed with `nomic-embed-text` → store in `chunks` with an HNSW cosine index.
2. **Retrieve**: embed the question → top-k nearest chunks → drop those below `RAG_MIN_SCORE`.
   If nothing is left, the API answers "not found" without calling the LLM.
3. **Answer**: the LLM gets the numbered passages plus recent history and is told to answer only
   from them and cite `[n]`.

## Tests

```sh
pnpm --filter @chat/api test       # unit tests
pnpm --filter @chat/api test:e2e   # needs the database and Ollama running
```
