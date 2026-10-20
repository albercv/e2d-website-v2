# Tarea 13 — Redirección permanente `www.e2dprojects.com` → `e2dprojects.com`

Estado: **pendiente de acceso** (cambio de infraestructura en producción; lo aplica Alberto).
Fecha de la comprobación: 2026-10-20.

## Estado actual comprobado

- `/etc/nginx/sites-available/villacastin` (enlazado en `sites-enabled`) sirve los dos hosts con el mismo
  bloque 443 (`server_name e2dprojects.com www.e2dprojects.com villacastin.local 76.13.62.189 _;`).
- `curl` del 2026-10-20:
  - `https://www.e2dprojects.com/es/` → `200` (sin redirección).
  - `http://www.e2dprojects.com/en/` → `301` a `https://www.e2dprojects.com/en/` (se queda en www).
  - `https://e2dprojects.com/es/` → `200`.
- El canonical, el sitemap y las alternancias del `<head>` ya usan el host sin `www` (`NEXT_PUBLIC_SITE_URL`).
  Pero la cabecera HTTP `Link` de next-intl usa el host de la petición: en www anuncia hreflang con www.
- El certificado `/etc/letsencrypt/live/e2dprojects.com/` cubre `DNS:e2dprojects.com, DNS:www.e2dprojects.com`
  (caduca el 2026-11-26; renovación con el plugin nginx de Certbot).
- La aplicación (`proxy.ts`) no tiene ninguna lógica de host: la regla vive solo en nginx, sin duplicarla.

## Cambio propuesto

Copia de seguridad primero:

```bash
cp /etc/nginx/sites-available/villacastin /etc/nginx/sites-available/villacastin.bak.20261020
```

1. Añadir este bloque **antes** del bloque 443 actual:

```nginx
# www → apex. Canonical, sitemap y hreflang usan el host sin www; una sola
# redirección permanente que conserva ruta y parámetros ($request_uri).
server {
    listen 443 ssl;
    server_name www.e2dprojects.com;

    ssl_certificate /etc/letsencrypt/live/e2dprojects.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/e2dprojects.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    include /etc/nginx/snippets/security-headers.conf;

    return 301 https://e2dprojects.com$request_uri;
}
```

2. En el bloque 443 actual, quitar `www.e2dprojects.com` de `server_name`:

```nginx
    server_name e2dprojects.com villacastin.local 76.13.62.189 _;
```

3. En el bloque 80, **sustituir** el `if` de Certbot que ya existe para `www` (hoy devuelve `301 https://$host$request_uri`, que se queda en www) por este, para que `www` vaya al apex en un solo salto. No añadirlo debajo: nginx ejecuta el primer `return`.

```nginx
    if ($host = www.e2dprojects.com) {
        return 301 https://e2dprojects.com$request_uri;
    }
```

(El `server_name` del bloque 80 se queda como está.)

## Aplicar y verificar

```bash
nginx -t
```

```bash
systemctl reload nginx
```

```bash
for u in "https://www.e2dprojects.com/es/" "https://www.e2dprojects.com/en/cookies/?a=1&b=2" "http://www.e2dprojects.com/es/" "https://www.e2dprojects.com/villacastin/"; do curl -s -o /dev/null -w "$u -> %{http_code} %{redirect_url}\n" "$u"; done
```

Resultado esperado: cada URL `www` responde `301` hacia `https://e2dprojects.com` con la misma ruta y la
misma query; `https://e2dprojects.com/es/` sigue en `200`.

```bash
curl -sIL "https://www.e2dprojects.com/es/" | grep -iE "^(HTTP|location)"
```

Esperado: un único `301` y después `200` (sin bucles).

```bash
certbot renew --dry-run --cert-name e2dprojects.com
```

Esperado: renovación simulada correcta (el plugin nginx sigue encontrando ambos nombres).

Vuelta atrás: `cp /etc/nginx/sites-available/villacastin.bak.20261020 /etc/nginx/sites-available/villacastin && nginx -t && systemctl reload nginx`.
