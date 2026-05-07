#!/bin/bash
# Vigilancia continua del post de Ferdy.
# Cada $INTERVAL segundos comprueba que el fichero existe. Si no, escribe
# un dump forense con timestamp UTC en logs/. Cooldown evita spam si el
# fichero sigue ausente N intervalos seguidos.
#
# Diseñado para PM2 (proceso de larga duración). Si crashea, set -u te lo
# dice; no usamos set -e para no abortar el bucle por fallos puntuales en
# herramientas opcionales (ausearch, journalctl).

set -u

TARGET="${TARGET:-/var/lib/e2d-content/posts/de-atender-curiosos-a-cerrar-clientes-la-web-de-ferdy.mdx}"
LOG_DIR="${LOG_DIR:-/root/e2dProject/e2d-website-v2/logs}"
COOLDOWN_FILE="${COOLDOWN_FILE:-/tmp/ferdy-tripwire.cooldown}"
INTERVAL="${INTERVAL:-180}"
COOLDOWN_SECONDS="${COOLDOWN_SECONDS:-300}"

mkdir -p "$LOG_DIR"

echo "[ferdy-tripwire] $(date -u +%FT%TZ) start (interval=${INTERVAL}s, cooldown=${COOLDOWN_SECONDS}s, target=$TARGET)"

while true; do
  if [[ -f "$TARGET" ]]; then
    sleep "$INTERVAL"
    continue
  fi

  now_epoch=$(date +%s)
  cooldown_until=0
  [[ -f "$COOLDOWN_FILE" ]] && cooldown_until=$(cat "$COOLDOWN_FILE" 2>/dev/null || echo 0)

  if [[ $now_epoch -lt $cooldown_until ]]; then
    sleep "$INTERVAL"
    continue
  fi

  echo $((now_epoch + COOLDOWN_SECONDS)) > "$COOLDOWN_FILE"
  stamp=$(date -u +%Y%m%dT%H%M%SZ)
  out="$LOG_DIR/ferdy-disappeared-$stamp.txt"

  {
    echo "=== FERDY DISAPPEARED ==="
    date -u +"detected_utc=%FT%TZ"
    echo "target=$TARGET"
    echo "tripwire_pid=$$"
    echo
    echo "=== ls /var/lib/e2d-content/posts/ ==="
    ls -la /var/lib/e2d-content/posts/ 2>&1
    echo
    echo "=== ps auxf ==="
    ps auxf 2>&1
    echo
    echo "=== ausearch -k e2d_posts -ts recent (last 200 lines) ==="
    ausearch -k e2d_posts -ts recent 2>&1 | tail -200
    echo
    echo "=== journalctl --since '15 minutes ago' (last 500 lines) ==="
    journalctl --since '15 minutes ago' -n 500 --no-pager 2>&1 | tail -500
    echo
    echo "=== tail -200 $LOG_DIR/posts-audit.log ==="
    tail -200 "$LOG_DIR/posts-audit.log" 2>/dev/null
    echo
    echo "=== tail -200 $LOG_DIR/fs-watchdog.log ==="
    tail -200 "$LOG_DIR/fs-watchdog.log" 2>/dev/null
    echo
    echo "=== ls -lat $LOG_DIR/fs-watchdog-snapshots/ (top 10) ==="
    ls -lat "$LOG_DIR/fs-watchdog-snapshots/" 2>/dev/null | head -10
    echo
    echo "=== tail -200 $LOG_DIR/pm2-out.log ==="
    tail -200 "$LOG_DIR/pm2-out.log" 2>/dev/null
    echo
    echo "=== tail -200 $LOG_DIR/pm2-error.log ==="
    tail -200 "$LOG_DIR/pm2-error.log" 2>/dev/null
  } > "$out" 2>&1

  echo "[ferdy-tripwire] $(date -u +%FT%TZ) FERDY DISAPPEARED -> $out"
  sleep "$INTERVAL"
done
