# MCP Examples Documentation

## Ejemplos de Uso de Herramientas MCP

Esta documentación proporciona ejemplos prácticos de cómo usar las herramientas MCP de Evolve2Digital.


## appointments.create

**Descripción:** MCP Tool: appointments.create Herramienta MCP para crear citas o solicitudes de contacto. Permite a los modelos de IA programar reuniones o enviar solicitudes de contacto estructuradas.

### Ejemplo de Solicitud

```bash
curl -X OPTIONS \
  "https://evolve2digital.comPOST /api/mcp/tools/appointments/create" \
  -H "Content-Type: application/json" \
  -H "User-Agent: YourAI/1.0" \
  -d '{"example": "data"}' \
```

### Ejemplo de Respuesta

```json
{
  "tool": "appointments.create",
  "success": true,
  "data": {},
  "timestamp": "2024-01-01T00:00:00.000Z",
  "processingTime": 150
}
```


## fetch

**Descripción:** MCP Wrapper Tool: fetch Endpoint MCP estándar para recuperación (POST) que formatea la salida en content[] y mantiene compatibilidad dual (MCP y JSON clásico) usando lib/mcp-format. Reutiliza la lógica de posts.get y admite entrada por slug+locale o url.

### Ejemplo de Solicitud

```bash
curl -X OPTIONS \
  "https://evolve2digital.comPOST /api/mcp/tools/fetch" \
  -H "Content-Type: application/json" \
  -H "User-Agent: YourAI/1.0" \
  -d '{"example": "data"}' \
```

### Ejemplo de Respuesta

```json
{
  "tool": "fetch",
  "success": true,
  "data": {},
  "timestamp": "2024-01-01T00:00:00.000Z",
  "processingTime": 150
}
```


## posts.search

**Descripción:** MCP Tool: posts.search Herramienta MCP para buscar artículos del blog que coincidan con una consulta textual. Reutiliza la lógica del ai-answers-service pero devuelve múltiples resultados estructurados para consumo por modelos de IA.

### Ejemplo de Solicitud

```bash
curl -X OPTIONS \
  "https://evolve2digital.comGET /api/mcp/tools/posts/search" \
  -H "Content-Type: application/json" \
  -H "User-Agent: YourAI/1.0" \
  -d '{"example": "data"}' \
```

### Ejemplo de Respuesta

```json
{
  "tool": "posts.search",
  "success": true,
  "data": {},
  "timestamp": "2024-01-01T00:00:00.000Z",
  "processingTime": 150
}
```


### Publicar un post en es/en/it

Secuencia de 4 llamadas. Las 3 primeras crean los ficheros sin rebuild; la última dispara el build.

```http
POST /api/mcp/tools/posts/create
Authorization: Bearer <token con scope posts:write>
Content-Type: application/json

{
  "title": "Mi post en español",
  "description": "Descripción en español",
  "locale": "es",
  "content": "# Encabezado\n\nContenido en MDX...",
  "tags": ["devops", "automatización"],
  "skip_rebuild": true
}
```

Respuesta 201:
```json
{ "created": true, "slug": "mi-post-en-espanol", "locale": "es", "url": "https://evolve2digital.com/es/blog/mi-post-en-espanol" }
```

Repetir para `locale:"en"` y `locale:"it"` con el contenido traducido (slugs distintos).

Tras los 3, disparar el rebuild:

```http
POST /api/mcp/tools/posts/rebuild
Authorization: Bearer <token con scope posts:write>
Content-Type: application/json

{}
```

Respuesta 200:
```json
{ "rebuilding": true, "started_at": "2026-05-02T14:00:00.000Z", "processingTime": 42 }
```

Esperar 1-3 minutos para que el build termine.


## search

**Descripción:** MCP Wrapper Tool: search Endpoint MCP estándar para búsqueda (POST) que formatea la salida en content[] y mantiene compatibilidad dual (MCP y JSON clásico) usando lib/mcp-format. Reutiliza la lógica de posts.search (filtrado y scoring) sobre Contentlayer.

### Ejemplo de Solicitud

```bash
curl -X OPTIONS \
  "https://evolve2digital.comPOST /api/mcp/tools/search" \
  -H "Content-Type: application/json" \
  -H "User-Agent: YourAI/1.0" \
  -d '{"example": "data"}' \
```

### Ejemplo de Respuesta

```json
{
  "tool": "search",
  "success": true,
  "data": {},
  "timestamp": "2024-01-01T00:00:00.000Z",
  "processingTime": 150
}
```



## Ejemplos de Integración

### JavaScript/Node.js

```javascript
const mcpClient = {
  baseUrl: 'https://evolve2digital.com',
  
  async callTool(toolName, data) {
    const response = await fetch(`${this.baseUrl}/api/mcp/tools/${toolName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MyAI/1.0'
      },
      body: JSON.stringify(data)
    })
    
    return response.json()
  }
}

// Ejemplo de uso
const result = await mcpClient.callTool('posts/search', {
  query: 'microservicios',
  locale: 'es',
  limit: 5
})
```

### Python

```python
import requests
import json

class MCPClient:
    def __init__(self, base_url="https://evolve2digital.com"):
        self.base_url = base_url
    
    def call_tool(self, tool_name, data):
        url = f"{self.base_url}/api/mcp/tools/{tool_name}"
        headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'MyAI/1.0'
        }
        
        response = requests.post(url, headers=headers, json=data)
        return response.json()

# Ejemplo de uso
client = MCPClient()
result = client.call_tool('posts/search', {
    'query': 'microservicios',
    'locale': 'es',
    'limit': 5
})
```

---

*Documentación generada automáticamente el 2026-05-02T09:58:38.264Z*
