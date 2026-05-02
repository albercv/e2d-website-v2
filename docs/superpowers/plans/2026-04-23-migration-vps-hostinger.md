# E2D Website — Migración VPS Hostinger (Production)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poner e2d-website-v2 en producción en el VPS de Hostinger (este servidor), verificar que funciona, cambiar el DNS en Cloudflare y dejar el servicio activo.

**Architecture:** Next.js standalone (`.next/standalone/server.js`) gestionado por PM2, expuesto por Nginx como reverse proxy con SSL via Certbot. La web funciona en puerto 3003 (el 3000 está reservado para archetypex.es). SQLite ya existe en `data/`.

**Tech Stack:** Node.js v22, PM2 v6, Nginx 1.24, Certbot (Let's Encrypt), Next.js 14 standalone

---

## Estado inicial confirmado

| Item | Estado |
|---|---|
| Node.js v22.22.1 | ✅ instalado |
| PM2 v6.0.14 | ✅ instalado |
| Nginx 1.24 | ✅ instalado y corriendo |
| Certbot | ✅ instalado (certs para archetypex.es) |
| `data/oauth.sqlite` | ✅ existe con datos OAuth |
| `node_modules/` | ❌ no existe |
| `.next/` build | ❌ no existe |
| PM2 processes | ❌ ninguno corriendo |
| Puerto 3003 | ✅ libre |

## Puertos en uso / reservados

| Puerto | Proyecto |
|---|---|
| 3000 | archetypex.es (nginx config) |
| 3002 | archegen.archetypex.es |
| 5678, 8080, 3100 | secondrow nginx config |
| **3003** | **← e2d-website-v2 (este proyecto)** |

---

## Fase 1 — Configurar entorno (.env y dependencias)

### Task 1: Cambiar puerto en .env

**Files:**
- Modify: `.env`

- [ ] **Step 1: Cambiar PORT de 3000 a 3003**

```bash
sed -i 's/^PORT=3000/PORT=3003/' /root/e2dProject/e2d-website-v2/.env
```

- [ ] **Step 2: Verificar el cambio**

```bash
grep "^PORT=" /root/e2dProject/e2d-website-v2/.env
```

Expected: `PORT=3003`

- [ ] **Step 3: Añadir MCP_ADMIN_USER (falta en .env — sin esto /api/mcp/logs siempre falla)**

```bash
echo 'MCP_ADMIN_USER=mcp_admin' >> /root/e2dProject/e2d-website-v2/.env
```

- [ ] **Step 4: Verificar NEXT_PUBLIC_BASE_URL apunta al dominio correcto**

```bash
grep "NEXT_PUBLIC_BASE_URL" /root/e2dProject/e2d-website-v2/.env
```

Expected: `NEXT_PUBLIC_BASE_URL=https://evolve2digital.com`

Si no está o está mal, corregirlo:

```bash
grep -q "^NEXT_PUBLIC_BASE_URL=" /root/e2dProject/e2d-website-v2/.env && \
  sed -i 's|^NEXT_PUBLIC_BASE_URL=.*|NEXT_PUBLIC_BASE_URL=https://evolve2digital.com|' /root/e2dProject/e2d-website-v2/.env || \
  echo 'NEXT_PUBLIC_BASE_URL=https://evolve2digital.com' >> /root/e2dProject/e2d-website-v2/.env
```

---

### Task 2: Corregir hardcoded fallback de dominio en build scripts

El script `build-ai-indexing-advanced.js` tiene `https://e2d.es` como fallback cuando `NEXT_PUBLIC_BASE_URL` no está definido. Con la variable bien puesta esto no aplica, pero lo corregimos igualmente.

**Files:**
- Modify: `scripts/build-ai-indexing-advanced.js`
- Modify: `scripts/build-ai-indexing-simple.js`

- [ ] **Step 1: Verificar el fallback en build-ai-indexing-advanced.js**

```bash
grep -n "e2d.es" /root/e2dProject/e2d-website-v2/scripts/build-ai-indexing-advanced.js | head -5
```

- [ ] **Step 2: Corregir el fallback**

```bash
sed -i "s|https://e2d.es|https://evolve2digital.com|g" \
  /root/e2dProject/e2d-website-v2/scripts/build-ai-indexing-advanced.js \
  /root/e2dProject/e2d-website-v2/scripts/build-ai-indexing-simple.js
```

- [ ] **Step 3: Verificar**

```bash
grep -n "e2d.es" \
  /root/e2dProject/e2d-website-v2/scripts/build-ai-indexing-advanced.js \
  /root/e2dProject/e2d-website-v2/scripts/build-ai-indexing-simple.js
```

Expected: sin resultados.

---

## Fase 2 — Instalar dependencias y construir

### Task 3: npm install

**Files:** `node_modules/` (se crea)

- [ ] **Step 1: Instalar dependencias**

```bash
cd /root/e2dProject/e2d-website-v2 && npm install 2>&1 | tail -20
```

Expected: sin errores fatales. Puede haber warnings de deprecación — ignorar.

- [ ] **Step 2: Verificar que better-sqlite3 compiló correctamente (es nativo)**

```bash
node -e "require('better-sqlite3')" && echo "OK" || echo "FAILED"
```

Expected: `OK`. Si falla, reconstruir:

```bash
cd /root/e2dProject/e2d-website-v2 && npm rebuild better-sqlite3
```

---

### Task 4: Build de Next.js

El build tiene 3 fases secuenciales: pull-content → next build → build-ai-indexing-advanced.

- [ ] **Step 1: Ejecutar el build completo (tarda ~5-10 min)**

```bash
cd /root/e2dProject/e2d-website-v2 && npm run build 2>&1 | tee /tmp/e2d-build.log
```

- [ ] **Step 2: Verificar que el build terminó sin errores fatales**

```bash
tail -30 /tmp/e2d-build.log
```

Expected: última línea del log debe ser algo como `✓ Compiled successfully` o `Route (app)`. Si hay error de compilación TypeScript/ESLint — con `ignoreBuildErrors: true` no debería fallar el build. Si falla por otra razón, leer el error.

- [ ] **Step 3: Verificar que el standalone existe**

```bash
ls /root/e2dProject/e2d-website-v2/.next/standalone/server.js
```

Expected: el archivo existe.

- [ ] **Step 4: Copiar assets estáticos al standalone (paso requerido para output:standalone)**

```bash
cp -r /root/e2dProject/e2d-website-v2/public \
      /root/e2dProject/e2d-website-v2/.next/standalone/public && \
cp -r /root/e2dProject/e2d-website-v2/.next/static \
      /root/e2dProject/e2d-website-v2/.next/standalone/.next/static
echo "Assets copiados OK"
```

---

## Fase 3 — Configurar PM2

### Task 5: Crear ecosystem.config.js

**Files:**
- Create: `ecosystem.config.js`

- [ ] **Step 1: Crear el archivo de configuración PM2**

```bash
cat > /root/e2dProject/e2d-website-v2/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'e2d',
    script: '.next/standalone/server.js',
    cwd: '/root/e2dProject/e2d-website-v2',
    instances: 1,
    exec_mode: 'fork',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3003,
      HOSTNAME: '127.0.0.1'
    },
    error_file: '/root/e2dProject/e2d-website-v2/logs/pm2-error.log',
    out_file: '/root/e2dProject/e2d-website-v2/logs/pm2-out.log',
    merge_logs: true,
    restart_delay: 3000,
    max_restarts: 5
  }]
}
EOF
```

- [ ] **Step 2: Crear directorio de logs**

```bash
mkdir -p /root/e2dProject/e2d-website-v2/logs
```

---

### Task 6: Arrancar la app con PM2

- [ ] **Step 1: Arrancar**

```bash
cd /root/e2dProject/e2d-website-v2 && pm2 start ecosystem.config.js --env production
```

- [ ] **Step 2: Verificar que arrancó**

```bash
pm2 list
```

Expected: proceso `e2d` en estado `online`.

- [ ] **Step 3: Verificar que responde en puerto 3003**

```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3003/es
```

Expected: `200` o `307` (redirect de locale). Si es `000`, el proceso no está escuchando — revisar logs.

- [ ] **Step 4: Revisar logs iniciales**

```bash
pm2 logs e2d --lines 30 --nostream
```

Buscar errores de inicio. Ignorar warnings de deprecación. Fallos críticos a revisar:
- `Cannot find module 'better-sqlite3'` → reconstruir con `npm rebuild better-sqlite3`
- `EADDRINUSE 3003` → hay algo usando el puerto, investigar con `lsof -i :3003`
- `JWT_SECRET is not defined` → revisar `.env`

- [ ] **Step 5: Guardar configuración PM2 para arranque automático**

```bash
pm2 save
```

- [ ] **Step 6: Configurar PM2 startup (para que arranque tras reboot)**

```bash
pm2 startup
```

Ejecutar el comando que devuelva (algo como `sudo env PATH=... pm2 startup systemd -u root --hp /root`).

---

## Fase 4 — Configurar Nginx

### Task 7: Crear configuración Nginx para evolve2digital.com

Primero configuramos HTTP sin SSL. El SSL se obtiene con certbot **después** de cambiar el DNS (el dominio tiene que apuntar a este servidor para que Let's Encrypt valide).

**Files:**
- Create: `/etc/nginx/sites-available/evolve2digital`

- [ ] **Step 1: Crear el archivo de configuración**

```bash
cat > /etc/nginx/sites-available/evolve2digital << 'EOF'
server {
    listen 80;
    server_name evolve2digital.com www.evolve2digital.com;

    client_max_body_size 10M;

    # Health check para verificar antes del DNS switch
    location /health {
        return 200 'e2d-vps-ok';
        add_header Content-Type text/plain;
    }

    location / {
        proxy_pass http://127.0.0.1:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts para SSE (Server-Sent Events del MCP)
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        proxy_buffering off;
    }
}
EOF
```

- [ ] **Step 2: Activar el sitio**

```bash
ln -sf /etc/nginx/sites-available/evolve2digital /etc/nginx/sites-enabled/evolve2digital
```

- [ ] **Step 3: Verificar sintaxis de nginx**

```bash
nginx -t
```

Expected: `syntax is ok` y `test is successful`.

- [ ] **Step 4: Recargar nginx**

```bash
systemctl reload nginx
```

---

## Fase 5 — Verificación local antes del DNS switch

### Task 8: Tests de funcionamiento via IP

Probamos accediendo directamente al servidor por IP (bypass del DNS) para verificar antes de apuntar el dominio.

- [ ] **Step 1: Obtener IP pública del servidor**

```bash
curl -s ifconfig.me
```

Anotar la IP. La llamaremos `<IP_SERVIDOR>`.

- [ ] **Step 2: Test del health check de Nginx**

```bash
curl -s http://127.0.0.1/health -H "Host: evolve2digital.com"
```

Expected: `e2d-vps-ok`

- [ ] **Step 3: Test de la home (locale redirect)**

```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/ -H "Host: evolve2digital.com"
```

Expected: `200` o `307`.

- [ ] **Step 4: Test de la ruta admin**

```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/es/admin -H "Host: evolve2digital.com"
```

Expected: `302` (redirect a login).

- [ ] **Step 5: Test del endpoint OAuth metadata**

```bash
curl -s http://127.0.0.1/.well-known/oauth-authorization-server -H "Host: evolve2digital.com" | head -50
```

Expected: JSON con `issuer`, `authorization_endpoint`, etc.

- [ ] **Step 6: Test del MCP manifest**

```bash
curl -s http://127.0.0.1/api/mcp/manifest -H "Host: evolve2digital.com" | head -30
```

Expected: JSON con lista de tools MCP.

- [ ] **Step 7: Verificar que las rutas muertas devuelven error controlado (no cuelgan)**

```bash
# Chat webhook muerto
curl -s -m 5 -X POST http://127.0.0.1/api/chat \
  -H "Host: evolve2digital.com" \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}' | head -20

# Budget webhook muerto  
curl -s -m 5 -X POST http://127.0.0.1/api/auth/budget \
  -H "Host: evolve2digital.com" \
  -H "Content-Type: application/json" \
  -d '{}' | head -20
```

Expected: Respuesta en menos de 5 segundos (pueden ser 502/503/500, lo importante es que no cuelguen).
Si cuelgan 30 segundos, hay que añadir timeout en esas rutas (ver Task 9 opcional).

- [ ] **Step 8: Test del SSE endpoint**

```bash
curl -s -m 3 http://127.0.0.1/sse -H "Host: evolve2digital.com" -H "Authorization: Bearer test" 2>&1 | head -5
```

Expected: respuesta inmediata (401 o primeras líneas SSE).

---

### Task 9 (Opcional): Arreglar timeout en rutas muertas

Si en el Task 8 Step 7 las rutas cuelgan > 5 segundos, hay que añadir timeouts. Solo hacer este task si el problema se confirma.

**Files:**
- Modify: `app/api/chat/route.ts`
- Modify: `app/api/auth/budget/route.ts`

- [ ] **Step 1: Verificar si el POST /api/chat cuelga**

```bash
time curl -s -X POST http://127.0.0.1:3003/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}' | head -5
```

Si tarda > 5s, el webhook URL está colgando la request.

- [ ] **Step 2: Añadir AbortSignal con timeout en /api/chat/route.ts**

Abrir `app/api/chat/route.ts` y localizar el `fetch(webhookUrl, ...)`. Añadir `signal: AbortSignal.timeout(5000)`:

```typescript
const response = await fetch(webhookUrl, {
  method: 'POST',
  headers: { /* ... */ },
  body: JSON.stringify(body),
  signal: AbortSignal.timeout(5000),   // ← añadir esta línea
})
```

Y asegurarse de que el catch devuelve una respuesta controlada:

```typescript
} catch (error) {
  return NextResponse.json(
    { error: 'Chat service temporarily unavailable' },
    { status: 503 }
  )
}
```

- [ ] **Step 3: Misma corrección en /api/auth/budget/route.ts**

Localizar el `fetch(webhookUrl, ...)` y añadir el mismo `signal: AbortSignal.timeout(5000)` con su catch.

- [ ] **Step 4: Mismo en /api/mcp/tools/agent/query/route.ts**

- [ ] **Step 5: Reconstruir (solo si se modificó código)**

```bash
cd /root/e2dProject/e2d-website-v2 && npm run build 2>&1 | tail -20
```

```bash
cp -r /root/e2dProject/e2d-website-v2/public \
      /root/e2dProject/e2d-website-v2/.next/standalone/public && \
cp -r /root/e2dProject/e2d-website-v2/.next/static \
      /root/e2dProject/e2d-website-v2/.next/standalone/.next/static && \
pm2 restart e2d
```

---

## Fase 6 — Configurar Cron Jobs

Los crons de Vercel hay que replicarlos como crontab del sistema. Hacen `curl` a los endpoints con el `CRON_SECRET`.

### Task 10: Configurar crontab del sistema

- [ ] **Step 1: Obtener el valor de CRON_SECRET**

```bash
grep "^CRON_SECRET=" /root/e2dProject/e2d-website-v2/.env
```

Anotar el valor. Lo llamaremos `<CRON_SECRET_VALUE>`.

- [ ] **Step 2: Añadir entradas al crontab**

```bash
(crontab -l 2>/dev/null; cat << 'EOF'
# E2D Website — Cron jobs (reemplaza los de vercel.json)
# Regenerar SEO cada hora
0 * * * * curl -s -X POST http://127.0.0.1:3003/api/cron/regenerate-seo -H "Authorization: Bearer PLACEHOLDER_CRON_SECRET" >> /root/e2dProject/e2d-website-v2/logs/cron.log 2>&1
# Regenerar docs MCP cada 6 horas
0 */6 * * * curl -s -X POST http://127.0.0.1:3003/api/cron/regenerate-mcp -H "Authorization: Bearer PLACEHOLDER_CRON_SECRET" >> /root/e2dProject/e2d-website-v2/logs/cron.log 2>&1
# Integrity check diario a las 2am
0 2 * * * curl -s -X POST http://127.0.0.1:3003/api/cron/integrity-check -H "Authorization: Bearer PLACEHOLDER_CRON_SECRET" >> /root/e2dProject/e2d-website-v2/logs/cron.log 2>&1
EOF
) | crontab -
```

**IMPORTANTE:** Reemplazar `PLACEHOLDER_CRON_SECRET` con el valor real antes de ejecutar el comando.

- [ ] **Step 3: Verificar el crontab**

```bash
crontab -l
```

Expected: ver las 3 entradas e2d.

- [ ] **Step 4: Test manual de un cron**

```bash
CRON_SECRET=$(grep "^CRON_SECRET=" /root/e2dProject/e2d-website-v2/.env | cut -d= -f2)
curl -s -X POST http://127.0.0.1:3003/api/cron/integrity-check \
  -H "Authorization: Bearer $CRON_SECRET"
```

Expected: JSON con resultado del check (ok o lista de archivos faltantes).

---

## Fase 6.5 — Migrar oauth.sqlite desde el servidor actual

El archivo `data/oauth.sqlite` del servidor GCP/actual contiene los clientes OAuth registrados (incluido `chatgpt-mcp`) y tokens activos. Hay que reemplazar el de esta máquina con la copia de producción antes del DNS switch, o los clientes OAuth de ChatGPT dejarán de funcionar.

El archivo aquí (`data/oauth.sqlite`, 28KB, fecha 22 Apr) puede ser una copia de desarrollo — necesita ser reemplazado por el de producción.

### Task 11: Migrar oauth.sqlite desde el servidor GCP

- [ ] **Step 1: Checkpoint del WAL en el servidor origen (ejecutar ALLÍ, antes de copiar)**

Conectar al servidor GCP/actual y ejecutar:

```bash
# En el servidor viejo (GCP)
sqlite3 /ruta/a/e2d-website-v2/data/oauth.sqlite "PRAGMA wal_checkpoint(TRUNCATE);"
```

Esto consolida los archivos `.sqlite-shm` y `.sqlite-wal` en el `.sqlite` principal antes de la copia.

- [ ] **Step 2: Backup del oauth.sqlite actual en este servidor (Hostinger)**

```bash
cp /root/e2dProject/e2d-website-v2/data/oauth.sqlite \
   /root/e2dProject/e2d-website-v2/data/oauth.sqlite.bak.$(date +%Y%m%d_%H%M%S)
ls -lh /root/e2dProject/e2d-website-v2/data/
```

- [ ] **Step 3: Copiar el sqlite de producción desde el servidor viejo**

Opción A — desde Hostinger (pull vía scp, requiere acceso SSH al servidor GCP):

```bash
scp usuario@IP_GCP:/ruta/a/e2d-website-v2/data/oauth.sqlite \
    /root/e2dProject/e2d-website-v2/data/oauth.sqlite
```

Opción B — desde el servidor GCP (push vía scp, requiere acceso SSH a Hostinger):

```bash
# Ejecutar en GCP
scp /ruta/a/e2d-website-v2/data/oauth.sqlite \
    root@IP_HOSTINGER:/root/e2dProject/e2d-website-v2/data/oauth.sqlite
```

- [ ] **Step 4: Verificar que el archivo se copió correctamente**

```bash
ls -lh /root/e2dProject/e2d-website-v2/data/oauth.sqlite
sqlite3 /root/e2dProject/e2d-website-v2/data/oauth.sqlite \
  "SELECT client_id, client_type FROM oauth_clients;"
```

Expected: ver `chatgpt-mcp` y `local-dev` en la lista de clientes.

- [ ] **Step 5: Verificar permisos del archivo**

```bash
chmod 644 /root/e2dProject/e2d-website-v2/data/oauth.sqlite
```

- [ ] **Step 6: Si la app ya está corriendo, reiniciar para que lea el nuevo SQLite**

```bash
pm2 restart e2d && pm2 logs e2d --lines 10 --nostream
```

---

## Fase 7 — Cambio de DNS: salir de Cloudflare, ir directo a Hostinger

**Motivación:** Los rangos de IP de Cloudflare están bloqueados por algunos ISPs y sistemas de filtrado en España. Salir de Cloudflare y apuntar directo al VPS elimina el problema.

**Estrategia DNS:** Cambiar nameservers en el registrador del dominio → Hostinger DNS (o cualquier DNS externo sin proxy). Propagación estimada: **12-48 horas**. Durante este tiempo algunos usuarios resolverán al servidor viejo y otros al nuevo — es inevitable con cambio de nameservers.

**Estrategia SSL:** Certbot nuevo con HTTP-01 challenge. Nginx sirve HTTP durante la propagación. Una vez el dominio resuelve a Hostinger, certbot obtiene el cert y Nginx pasa a HTTPS automáticamente. No hay razón para portar el cert de Cloudflare — con el cambio de nameservers deja de ser visible de todas formas.

### Task 12: Preparar DNS en Hostinger antes del switch

- [ ] **Step 1: Verificar IP pública de este servidor**

```bash
curl -s ifconfig.me
```

Anotar: esta es la IP que hay que configurar en los registros A.

- [ ] **Step 2: Anotar IP del servidor viejo (para rollback)**

```bash
host evolve2digital.com 8.8.8.8 | grep "has address"
```

Si la migración falla, se pueden revertir los nameservers al registrador o añadir de nuevo los de Cloudflare.

- [ ] **Step 3: En Hostinger (o proveedor DNS elegido) crear zona DNS para evolve2digital.com**

Registros mínimos a crear:

| Tipo | Nombre | Valor | TTL |
|---|---|---|---|
| A | `@` | `<IP_HOSTINGER>` | 300 |
| A | `www` | `<IP_HOSTINGER>` | 300 |
| MX | `@` | (mantener los MX existentes de email) | 3600 |

**IMPORTANTE:** Antes de cambiar nameservers, exportar todos los registros DNS actuales de Cloudflare (especialmente MX, TXT de SPF/DKIM, etc.) para no perder configuración de email.

- [ ] **Step 4: Exportar registros DNS desde Cloudflare**

En Cloudflare → DNS → zona evolve2digital.com → "Export" (descarga un archivo de zona). Guardar como referencia.

- [ ] **Step 5: Cambiar nameservers en el registrador del dominio**

Ir al panel del registrador donde está registrado `evolve2digital.com` y cambiar los nameservers de los de Cloudflare (habitualmente `*.ns.cloudflare.com`) a los de Hostinger u otro proveedor.

Los nameservers de Hostinger suelen ser:
```
ns1.dns-parking.com
ns2.dns-parking.com
```
(verificar en el panel de Hostinger → Dominios → DNS)

- [ ] **Step 6: Monitorizar propagación**

```bash
# Comprobar qué nameservers están respondiendo ya
watch -n 60 'dig NS evolve2digital.com +short'
```

```bash
# Comprobar cuándo el A record apunta a Hostinger
watch -n 60 'dig A evolve2digital.com @8.8.8.8 +short'
```

Expected: cuando el A record devuelva la IP de Hostinger, el tráfico llega a este servidor.

---

## Fase 8 — SSL tras propagación

Ejecutar una vez que `dig A evolve2digital.com @8.8.8.8` devuelva la IP de Hostinger.

### Task 13: Obtener certificado SSL con HTTP challenge

- [ ] **Step 1: Verificar que el dominio resuelve a este servidor**

```bash
dig A evolve2digital.com @8.8.8.8 +short
curl -s ifconfig.me
```

Los dos valores deben coincidir antes de continuar.

- [ ] **Step 2: Obtener certificado con certbot**

```bash
certbot --nginx -d evolve2digital.com -d www.evolve2digital.com \
  --non-interactive --agree-tos -m alberto.carrasco@evolve2digital.com
```

Certbot modificará automáticamente `/etc/nginx/sites-available/evolve2digital` para añadir SSL y redirigir HTTP → HTTPS.

- [ ] **Step 3: Verificar el certificado**

```bash
certbot certificates | grep -A3 evolve2digital
```

- [ ] **Step 4: Test HTTPS**

```bash
curl -s -o /dev/null -w "%{http_code}" https://evolve2digital.com/es
```

Expected: `200`.

---

## Fase 9 — Verificación post-switch

### Task 14: Smoke tests completos en producción

- [ ] **Step 1: Home en los tres idiomas**

```bash
for locale in es en it; do
  code=$(curl -s -o /dev/null -w "%{http_code}" https://evolve2digital.com/$locale)
  echo "$locale: $code"
done
```

Expected: todos `200`.

- [ ] **Step 2: Admin login (verificar que redirige, no 500)**

```bash
curl -s -o /dev/null -w "%{http_code}" https://evolve2digital.com/es/admin/login
```

Expected: `200`.

- [ ] **Step 3: OAuth metadata**

```bash
curl -s https://evolve2digital.com/.well-known/oauth-authorization-server | python3 -m json.tool | head -20
```

Expected: JSON bien formado con `issuer: "https://evolve2digital.com"`.

- [ ] **Step 4: MCP manifest**

```bash
curl -s https://evolve2digital.com/api/mcp/manifest | python3 -m json.tool | head -20
```

Expected: JSON con tools list.

- [ ] **Step 5: Verificar logs de PM2**

```bash
pm2 logs e2d --lines 50 --nostream
```

Buscar errores. Ignorar: warnings de deprecación, logs de crawlers. Alertar si: `unhandledRejection`, `ECONNREFUSED`, errores de SQLite.

- [ ] **Step 6: Verificar SSE endpoint**

```bash
curl -s -m 3 https://evolve2digital.com/sse -H "Authorization: Bearer invalid" 2>&1
```

Expected: `401 Unauthorized` inmediato.

- [ ] **Step 7: Test de blog (verifica Contentlayer)**

```bash
curl -s -o /dev/null -w "%{http_code}" https://evolve2digital.com/es/blog
```

Expected: `200`.

- [ ] **Step 8: Monitorizar PM2 durante 10 minutos**

```bash
pm2 monit
```

Observar uso de CPU y memoria. Si la memoria crece sin parar, hay un memory leak — reiniciar con `pm2 restart e2d` y crear un issue.

---

## Fase 10 — Post-migración: Estabilización

### Task 15: Configurar RESTART_COMMAND en .env

El script `rebuild-and-restart.js` necesita saber cómo reiniciar PM2.

**Files:**
- Modify: `.env`

- [ ] **Step 1: Añadir RESTART_COMMAND**

```bash
echo 'RESTART_COMMAND=pm2 restart e2d' >> /root/e2dProject/e2d-website-v2/.env
echo 'PROJECT_DIR=/root/e2dProject/e2d-website-v2' >> /root/e2dProject/e2d-website-v2/.env
```

- [ ] **Step 2: Verificar**

```bash
grep -E "^(RESTART_COMMAND|PROJECT_DIR)=" /root/e2dProject/e2d-website-v2/.env
```

---

### Task 16: Actualizar TAREAS_PENDIENTES.md

- [ ] **Step 1: Marcar como completadas las tareas de migración**

Editar `/root/e2dProject/e2d-website-v2/TAREAS_PENDIENTES.md`:
- Marcar como `[x]`: "Configurar Nginx en Hostinger", "Cambiar registro A en Cloudflare", "Verificar build completo en Hostinger"
- Mantener pendientes: reimplementar chat, budget, agent.query, backup oauth.sqlite, etc.

---

## Resumen de comandos críticos post-arranque

```bash
# Ver estado del proceso
pm2 list

# Ver logs en tiempo real
pm2 logs e2d

# Reiniciar sin rebuild
pm2 restart e2d

# Rebuild completo + reinicio
cd /root/e2dProject/e2d-website-v2 && \
npm run build && \
cp -r public .next/standalone/public && \
cp -r .next/static .next/standalone/.next/static && \
pm2 restart e2d

# Ver logs de nginx
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log

# Reiniciar nginx
systemctl reload nginx
```

---

## Notas de rollback

Si algo va muy mal tras el DNS switch y hay que revertir:

1. Ir a Cloudflare → cambiar A record de vuelta a la IP del servidor viejo
2. Propagación: ~1 min con TTL bajo

El servidor viejo no se apaga hasta confirmar que este funciona correctamente varios días.

---

## Próximos pasos (FUERA del alcance de este plan)

Una vez el servidor esté estable, estos son los servicios muertos a reimplementar:

1. **Chat** (`/api/chat`): Reemplazar proxy a n8n por agente propio (Anthropic API + streaming)
2. **Budget webhook** (`/api/auth/budget`): Reemplazar por envío de email (Resend/Nodemailer) o lógica propia
3. **Agent query** (`/api/mcp/tools/agent/query`): Reemplazar por agente Claude API propio

---

_Plan creado: 2026-04-23 | Rama: develop_
