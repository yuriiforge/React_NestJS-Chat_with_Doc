CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  mime_type   text NOT NULL,
  size_bytes  integer NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- embedding dimension must match the embedding model (nomic-embed-text = 768)
CREATE TABLE IF NOT EXISTS chunks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index  integer NOT NULL,
  page         integer,
  content      text NOT NULL,
  embedding    vector(768) NOT NULL
);

CREATE INDEX IF NOT EXISTS chunks_document_id_idx ON chunks (document_id);
CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON chunks USING hnsw (embedding vector_cosine_ops);
