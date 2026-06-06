-- Per-response token + cost telemetry for the AI chat agent.
-- One row per assistant response. `cost_usd_micro` is stored in
-- micro-USD (integer) to avoid floating-point drift across millions
-- of rows; divide by 1e6 to get USD.
--
-- Foreign keys use ON DELETE SET NULL so retention purges of
-- chat_messages / chat_sessions never break analytics history.

CREATE TABLE IF NOT EXISTS chat_usage (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid REFERENCES chat_sessions(id) ON DELETE SET NULL,
    message_id uuid REFERENCES chat_messages(id) ON DELETE SET NULL,
    locale text NOT NULL,
    model text NOT NULL,
    input_tokens integer,
    output_tokens integer,
    total_tokens integer,
    embedding_tokens integer,
    retrieved_chunks integer,
    duration_ms integer,
    cost_usd_micro integer,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_usage_created_at_idx ON chat_usage(created_at);
CREATE INDEX IF NOT EXISTS chat_usage_session_id_idx ON chat_usage(session_id);
