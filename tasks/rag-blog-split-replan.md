# Replan — RAG / Blog separation

**Fecha:** 2026-05-15
**Estado:** rama `feature/rag-blog-split` descartada. Reabrir como nueva tarea.

## Qué se malinterpretó

La rama `feature/rag-blog-split` (commit `980dd15`) asumió que blog debía **excluirse del retriever del chat** por defecto. Eso es **incorrecto**: el blog SÍ debe usarse para responder en el chat — era comportamiento deseado.

## Qué se debería haber hecho

La separación pedida es **visual**, en el panel de administración (`/admin/embeddings`):

- Blog → su propia categoría / tab dedicado
- Docs específicos para chat embedding → otro tab dedicado
- Sin lógica que cambie qué consume el retriever

## Trabajo a descartar

- Columna SQL `kb_documents.included_in_chat` (no aporta valor, blog siempre incluido)
- Índice `kb_documents_included_in_chat_idx`
- Filtro en `lib/chat/retriever.ts`
- Toggle UI `app/admin/embeddings/include-toggle.tsx`
- Endpoints PATCH `included_in_chat` en `app/api/admin/embeddings/*`
- Env override `RAG_FORCE_INCLUDE_BLOG`
- Migration `0004_kb_documents_included_in_chat.sql`

## Trabajo a replanificar (nueva tarea)

UI admin: dos tabs/categorías en `/admin/embeddings`:
1. **Blog posts** — lista filtrada `source='blog'`
2. **Knowledge docs** — lista filtrada `source != 'blog'` (o el set que aplique)

Sin tocar retriever ni schema. Solo presentación.

## Rollback ya ejecutado

- DB: `DROP COLUMN included_in_chat`, `DROP INDEX kb_documents_included_in_chat_idx`
- Branch local + remote: borrada
- Vuelta a `develop`
