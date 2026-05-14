/**
 * Drizzle schema for the AI chat agent backend.
 *
 * Tables cover: session lifecycle, conversation history, RAG knowledge base
 * (documents + embedded chunks), captured leads, and the Apollo sync queue.
 * Embedding dimension 1536 matches OpenAI text-embedding-3-small / DeepSeek
 * embed sizes used by the RAG pipeline (other agents' scope).
 */

import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const chatSessions = pgTable(
  "chat_sessions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    visitorId: text("visitor_id"),
    locale: text("locale").notNull(),
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    lastActivityAt: timestamp("last_activity_at", {
      withTimezone: true,
    }).defaultNow(),
  },
  (t) => ({
    visitorIdx: index().on(t.visitorId),
  }),
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    // role is plain text on purpose (no pg enum) — values: user | assistant | system
    role: text("role").notNull(),
    content: text("content").notNull(),
    tokenCount: integer("token_count"),
    retrievedChunkIds: uuid("retrieved_chunk_ids").array(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    sessionIdx: index().on(t.sessionId),
  }),
);

export const kbDocuments = pgTable(
  "kb_documents",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    // source values: blog | service | faq | landing | ai-answer
    source: text("source").notNull(),
    sourceRef: text("source_ref").notNull(),
    locale: text("locale").notNull(),
    title: text("title"),
    url: text("url"),
    contentHash: text("content_hash").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    sourceRefLocaleUnique: uniqueIndex().on(t.source, t.sourceRef, t.locale),
  }),
);

export const kbChunks = pgTable(
  "kb_chunks",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    documentId: uuid("document_id")
      .notNull()
      .references(() => kbDocuments.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    tokenCount: integer("token_count"),
    embedding: vector("embedding", { dimensions: 1536 }),
  },
  (t) => ({
    documentIdx: index().on(t.documentId),
  }),
);

export const chatLeads = pgTable("chat_leads", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id").references(() => chatSessions.id, {
    onDelete: "set null",
  }),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  intent: text("intent"),
  message: text("message"),
  consent: boolean("consent").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const apolloSyncQueue = pgTable(
  "apollo_sync_queue",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => chatLeads.id, { onDelete: "cascade" }),
    // status values: pending | synced | failed
    status: text("status").default("pending"),
    attempts: integer("attempts").default(0),
    lastError: text("last_error"),
    syncedAt: timestamp("synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    leadUnique: uniqueIndex().on(t.leadId),
  }),
);

// Row types — exported so other agents typecheck against the canonical schema.
export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;

export type KbDocument = typeof kbDocuments.$inferSelect;
export type NewKbDocument = typeof kbDocuments.$inferInsert;

export type KbChunk = typeof kbChunks.$inferSelect;
export type NewKbChunk = typeof kbChunks.$inferInsert;

export type ChatLead = typeof chatLeads.$inferSelect;
export type NewChatLead = typeof chatLeads.$inferInsert;

export type ApolloSyncQueueRow = typeof apolloSyncQueue.$inferSelect;
export type NewApolloSyncQueueRow = typeof apolloSyncQueue.$inferInsert;
