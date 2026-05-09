#!/usr/bin/env bash
# Purga ficheros de la papelera de posts con más de 30 días.
#
# El soft-delete de `lib/blog/posts-write.ts:softDeleteFile` mueve los `.mdx`
# borrados a `${BLOG_POSTS_DIR}/.trash/`. Sin esta purga, la papelera crece
# indefinidamente. La ventana de 30 días da tiempo razonable para detectar un
# delete accidental y restaurar.
#
# Cron sugerido (no instalado por defecto):
#   30 3 * * * /root/e2dProject/e2d-website-v2/scripts/posts-trash-purge.sh \
#     >> /root/e2dProject/e2d-website-v2/logs/cron.log 2>&1
set -euo pipefail

TRASH="${BLOG_POSTS_DIR:-/var/lib/e2d-content/posts}/.trash"
RETENTION_DAYS="${POSTS_TRASH_RETENTION_DAYS:-30}"

if [ ! -d "$TRASH" ]; then
  exit 0
fi

# +N en find es "más antiguo que N días". Sólo borrar ficheros, dejar el dir.
find "$TRASH" -type f -name '*.mdx' -mtime "+${RETENTION_DAYS}" -print -delete

# Limpia subdirectorios vacíos pero conserva el `.trash/` raíz.
find "$TRASH" -mindepth 1 -type d -empty -delete 2>/dev/null || true
