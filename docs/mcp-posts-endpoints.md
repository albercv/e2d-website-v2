# Endpoints MCP de Posts: create y delete

## Resumen

Los endpoints `posts_create` y `posts_delete` permiten crear y eliminar posts (MDX) del blog dentro del repositorio. Ambos están protegidos mediante API key y soportan formato MCP opcional además de JSON clásico.

- Autenticación: requerida mediante `Authorization: Bearer <API_KEY>` o `X-API-Key`
- Formato de respuesta: MCP opcional por `Accept: application/mcp+json` o query `?mcp=1`
- Rate limiting: 20 peticiones por minuto por IP (configuración por defecto)
- Locales soportados: `es`, `en`, `it`

## Detección de formato MCP (opcional)

La API puede responder en formato MCP si el cliente lo solicita. Existen dos métodos de detección equivalentes:

1) Cabecera `Accept: application/mcp+json`
2) Parámetro de query `?mcp=1` (o `?mcp=true`)

Si no se solicita MCP, la respuesta será JSON clásico.

## Autenticación

Estos endpoints requieren API key. Configura en tu entorno:

```
E2D_MCP_API_KEY=local-dev-mcp-key
```

Envía la API key mediante uno de estos encabezados:

- `Authorization: Bearer local-dev-mcp-key`
- `X-API-Key: local-dev-mcp-key`

Errores de autenticación:
- 401 `missing_api_key`: Falta la API key en la petición
- 401 `server_api_key_missing`: El servidor no tiene configurada la API key
- 401 `invalid_api_key`: La API key no coincide

## posts_create

- URL: `/api/mcp/tools/posts/create`
- Método: `POST`
- Content-Type: `application/json`
- Autenticación: requerida
- Rate limit: 20/min por IP (por defecto)

### Body (JSON)

```
{
  "title": "string (mín. 3)",
  "description": "string (mín. 10)",
  "locale": "es|en|it",
  "content": "string MDX (mín. 50)",
  "tags": ["string"],
  "date": "YYYY-MM-DD",
  "author": "string",
  "published": true|false
}
```

Campos requeridos: `title`, `description`, `locale`, `content`

### Respuesta exitosa

- JSON clásico:
```
{
  "created": true,
  "slug": "ejemplo-titulo-mcp",
  "locale": "es",
  "url": "https://evolve2digital.com/blog/ejemplo-titulo-mcp",
  "path": "/absolute/path/a/content/posts/ejemplo-titulo-mcp.mdx",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "processingTime": 123
}
```

- MCP:
```
{
  "content": [
    {
      "type": "text",
      "text": "{\"created\":true,\"slug\":\"ejemplo-titulo-mcp\",...}"
    }
  ]
}
```

### Ejemplos cURL

- MCP por cabecera `Accept`:
```
curl -X POST "http://localhost:3000/api/mcp/tools/posts/create" \
  -H "Content-Type: application/json" \
  -H "Accept: application/mcp+json" \
  -H "Authorization: Bearer local-dev-mcp-key" \
  -d '{
    "title": "Ejemplo título MCP",
    "description": "Descripción de ejemplo para MCP",
    "locale": "es",
    "content": "# Encabezado\n\nContenido de ejemplo del post en formato MDX..."
  }'
```

- MCP por query `?mcp=1`:
```
curl -X POST "http://localhost:3000/api/mcp/tools/posts/create?mcp=1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer local-dev-mcp-key" \
  -d '{
    "title": "Ejemplo título MCP",
    "description": "Descripción de ejemplo para MCP",
    "locale": "es",
    "content": "# Encabezado\n\nContenido de ejemplo del post en formato MDX..."
  }'
```

- JSON clásico:
```
curl -X POST "http://localhost:3000/api/mcp/tools/posts/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer local-dev-mcp-key" \
  -d '{
    "title": "Ejemplo título JSON",
    "description": "Descripción de ejemplo para JSON",
    "locale": "es",
    "content": "# Encabezado\n\nContenido de ejemplo del post en formato MDX..."
  }'
```

## posts_delete

- URL: `/api/mcp/tools/posts/delete`
- Método recomendado: `POST` (también acepta `DELETE`)
- Content-Type: `application/json`
- Autenticación: requerida
- Rate limit: 20/min por IP (por defecto)

### Body (JSON) para `POST`

```
{
  "slug": "string (mín. 2)",
  "locale": "es|en|it (opcional)"
}
```

### Query params para `DELETE`

- `slug` (requerido)
- `locale` (opcional)

### Respuesta exitosa

- JSON clásico:
```
{
  "deleted": true,
  "slug": "ejemplo-titulo-mcp",
  "locale": "es",
  "url": "https://evolve2digital.com/blog/ejemplo-titulo-mcp",
  "path": "/absolute/path/a/content/posts/ejemplo-titulo-mcp.mdx",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "processingTime": 87
}
```

- MCP:
```
{
  "content": [
    {
      "type": "text",
      "text": "{\"deleted\":true,\"slug\":\"ejemplo-titulo-mcp\",...}"
    }
  ]
}
```

### Ejemplos cURL

- `POST` MCP:
```
curl -X POST "http://localhost:3000/api/mcp/tools/posts/delete" \
  -H "Content-Type: application/json" \
  -H "Accept: application/mcp+json" \
  -H "Authorization: Bearer local-dev-mcp-key" \
  -d '{
    "slug": "ejemplo-titulo-mcp",
    "locale": "es"
  }'
```

- `DELETE` MCP por query:
```
curl -X DELETE "http://localhost:3000/api/mcp/tools/posts/delete?slug=ejemplo-titulo-mcp&locale=es&mcp=1" \
  -H "Accept: application/mcp+json" \
  -H "Authorization: Bearer local-dev-mcp-key"
```

- `DELETE` JSON clásico:
```
curl -X DELETE "http://localhost:3000/api/mcp/tools/posts/delete?slug=ejemplo-titulo-mcp&locale=es" \
  -H "Authorization: Bearer local-dev-mcp-key"
```

## Códigos y errores MCP comunes

- `missing_api_key` (401): Falta API key
- `server_api_key_missing` (401): El servidor no tiene configurada la API key
- `invalid_api_key` (401): API key incorrecta
- `rate_limit_exceeded` (429): Límite de peticiones excedido
- `invalid_json` (400): Body JSON inválido
- `invalid_params` (400): Parámetros inválidos (violación de esquema)
- `unsupported_locale` (400): Locale no soportado
- `conflict` (409): Conflicto (por ejemplo, ya existe el slug o el locale no coincide)
- `not_found` (404): No se encontró el post para eliminar
- `internal_error` (500): Error inesperado

## Cabeceras relevantes

- MCP/CORS:
  - `X-MCP-Tool: posts_create | posts_delete`
  - `Access-Control-Allow-Origin: *`
  - `Access-Control-Allow-Methods: POST, DELETE, OPTIONS`
  - `Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key, Accept`
- Autenticación:
  - `WWW-Authenticate: Bearer realm="MCP"` (en 401)
- Rate limiting:
  - `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`

## Notas y troubleshooting

- Slug: se genera a partir del `title`. Ej.: "Ejemplo título MCP" -> `ejemplo-titulo-mcp`
- Contentlayer: puede haber una pequeña latencia en la indexación tras crear/eliminar archivos
- Base URL: para que el campo `url` apunte a localhost durante el desarrollo, configura `NEXT_PUBLIC_BASE_URL=http://localhost:3000`
- Locales: asegúrate de que `locale` sea uno de `es`, `en`, `it`
- Paths absolutos: la eliminación usa rutas absolutas (resueltas desde `process.cwd()/content`), evitando errores `ENOENT`