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

*Documentación generada automáticamente el 2025-11-01T06:02:32.420Z*
