-- Editable per-locale system prompt, versioned.
-- One row is marked is_active = TRUE per (locale); the runtime prompt builder
-- reads the active body via prompt-store (in-memory cache, 60s TTL) and falls
-- back to the hardcoded template in lib/chat/prompt.ts when no row exists or
-- the query fails.

CREATE TABLE IF NOT EXISTS system_prompts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    locale text NOT NULL,
    version integer NOT NULL,
    body text NOT NULL,
    notes text,
    created_by text,
    created_at timestamptz NOT NULL DEFAULT now(),
    is_active boolean NOT NULL DEFAULT FALSE,
    CONSTRAINT system_prompts_locale_version UNIQUE (locale, version)
);

CREATE INDEX IF NOT EXISTS system_prompts_locale_active_idx
    ON system_prompts (locale)
    WHERE is_active = TRUE;
