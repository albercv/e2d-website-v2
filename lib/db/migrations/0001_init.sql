-- Initial schema for the AI chat agent backend.
-- Targets pgvector/pgvector:pg16. Loads required extensions, creates all six
-- domain tables, and adds the lookup + ANN indices used by the RAG pipeline.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS chat_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id text,
    locale text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    last_activity_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role text NOT NULL,
    content text NOT NULL,
    token_count integer,
    retrieved_chunk_ids uuid[],
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kb_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source text NOT NULL,
    source_ref text NOT NULL,
    locale text NOT NULL,
    title text,
    url text,
    content_hash text NOT NULL,
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kb_chunks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
    chunk_index integer NOT NULL,
    content text NOT NULL,
    token_count integer,
    embedding vector(1536)
);

CREATE TABLE IF NOT EXISTS chat_leads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid REFERENCES chat_sessions(id) ON DELETE SET NULL,
    email text,
    phone text,
    company text,
    intent text,
    consent boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS apollo_sync_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id uuid NOT NULL REFERENCES chat_leads(id) ON DELETE CASCADE,
    status text DEFAULT 'pending',
    attempts integer DEFAULT 0,
    last_error text,
    synced_at timestamptz,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_sessions_visitor_id_idx ON chat_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS chat_messages_session_id_idx ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS kb_chunks_document_id_idx ON kb_chunks(document_id);
CREATE UNIQUE INDEX IF NOT EXISTS kb_documents_source_ref_locale_uidx
    ON kb_documents(source, source_ref, locale);
CREATE UNIQUE INDEX IF NOT EXISTS apollo_sync_queue_lead_id_uidx
    ON apollo_sync_queue(lead_id);

-- IVFFlat ANN index for cosine similarity. lists=100 is a sensible starting
-- point for ~10k–100k chunks; tune once corpus size is known.
CREATE INDEX IF NOT EXISTS kb_chunks_embedding_ivfflat_idx
    ON kb_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
