#!/bin/bash
# Forensic watchdog para /var/lib/e2d-content/posts/
# Loguea TODA escritura/borrado con timestamp + snapshot de procesos node
# Salida: logs/fs-watchdog.log
#
# Diseñado para BUG-15: archivos desaparecen sin entrada en posts-audit.log

WATCH_DIR="/var/lib/e2d-content/posts"
LOG_FILE="/root/e2dProject/e2d-website-v2/logs/fs-watchdog.log"
PS_SNAPSHOT_DIR="/root/e2dProject/e2d-website-v2/logs/fs-watchdog-snapshots"

mkdir -p "$PS_SNAPSHOT_DIR"

echo "[$(date -u +%FT%T.%3NZ)] [watchdog] start watching $WATCH_DIR (pid=$$)" >> "$LOG_FILE"

inotifywait \
  --monitor \
  --recursive \
  --timefmt '%FT%T.000Z' \
  --format '%T|%e|%w%f' \
  --event create,delete,modify,moved_from,moved_to,attrib,delete_self,move_self \
  "$WATCH_DIR" 2>/dev/null | while IFS='|' read -r ts event path; do
    # Linea principal del evento
    echo "[$ts] $event $path" >> "$LOG_FILE"

    # Para deletes y moves, capturamos snapshot de procesos node + pm2 logs recientes
    case "$event" in
      DELETE|MOVED_FROM|DELETE_SELF|MOVE_SELF)
        snap="$PS_SNAPSHOT_DIR/snap-$(date -u +%Y%m%dT%H%M%S%3N)-${event}.txt"
        {
          echo "=== EVENT $event $path AT $ts ==="
          echo
          echo "--- ps auxf (nodes) ---"
          ps auxf | grep -E "node|next|pm2" | grep -v grep
          echo
          echo "--- pm2 list ---"
          pm2 jlist 2>/dev/null | head -200
          echo
          echo "--- last 30 lines pm2-out.log ---"
          tail -30 /root/e2dProject/e2d-website-v2/logs/pm2-out.log 2>/dev/null
          echo
          echo "--- last 30 lines pm2-error.log ---"
          tail -30 /root/e2dProject/e2d-website-v2/logs/pm2-error.log 2>/dev/null
        } > "$snap"
        echo "[$ts] $event $path -> snapshot=$snap" >> "$LOG_FILE"
        ;;
    esac
done
