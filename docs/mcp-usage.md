# MCP Usage Documentation

## Evolve2Digital MCP Server

Este documento describe cómo usar los endpoints MCP (Model Context Protocol) de Evolve2Digital.

### Base URL
```
https://evolve2digital.com
```

### Manifest
Para obtener el manifest completo del servidor MCP:
```
GET /api/mcp/manifest
```

## Endpoints Disponibles


### GET /api/mcp/logs

**Descripción:** MCP Logs Admin Endpoint Endpoint administrativo para consultar logs y estadísticas del sistema MCP. Proporciona acceso a métricas de uso, errores y rendimiento.

**Ruta:** `GET /api/mcp/logs`
**Métodos:** OPTIONS, GET, POST, POST, POST, POST
**Categoría:** general

**Acceso:** Administrativo
**Seguridad:** basic-auth



### GET /api/mcp/manifest

**Descripción:** MCP (Model Context Protocol) Manifest Endpoint Endpoint que expone el contrato MCP oficial del sitio, describiendo todas las herramientas disponibles para modelos de IA como ChatGPT y Claude.

**Ruta:** `GET /api/mcp/manifest`
**Métodos:** OPTIONS, GET, POST, POST, POST, POST
**Categoría:** general
**Acceso:** Público





### POST /api/mcp/tools/agent/query

**Descripción:** MCP Tool: agent.query Expone el agente IA interno de E2D públicamente a través del protocolo MCP. Permite a modelos externos (ChatGPT, Claude) consultar al agente E2D.

**Ruta:** `POST /api/mcp/tools/agent/query`
**Métodos:** POST, OPTIONS
**Categoría:** general






### appointments.create

**Descripción:** MCP Tool: appointments.create Herramienta MCP para crear citas o solicitudes de contacto. Permite a los modelos de IA programar reuniones o enviar solicitudes de contacto estructuradas.

**Ruta:** `POST /api/mcp/tools/appointments/create`
**Métodos:** OPTIONS, POST, GET, GET, GET, GET
**Categoría:** actions






### posts.search

**Descripción:** MCP Tool: posts.search Herramienta MCP para buscar artículos del blog que coincidan con una consulta textual. Reutiliza la lógica del ai-answers-service pero devuelve múltiples resultados estructurados para consumo por modelos de IA.

**Ruta:** `GET /api/mcp/tools/posts/search`
**Métodos:** OPTIONS, GET, POST, POST, POST, POST
**Categoría:** content







## Autenticación

### Endpoints Públicos
Los endpoints marcados como públicos no requieren autenticación.

### Endpoints Administrativos
Los endpoints administrativos requieren autenticación básica:
```
Authorization: Basic <base64(username:password)>
```

## Rate Limiting

Todos los endpoints tienen límites de velocidad para prevenir abuso:
- **Endpoints públicos:** 100 requests/minuto por IP
- **Endpoints de herramientas:** 10 requests/hora por IP
- **Endpoints administrativos:** 50 requests/hora por IP autenticado

## Headers Recomendados

```
Content-Type: application/json
User-Agent: YourAI/1.0
Accept: application/json
```

## Manejo de Errores

Todos los endpoints devuelven errores en formato JSON:
```json
{
  "error": "Error type",
  "message": "Detailed error message",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Códigos de Estado Comunes
- **200:** Éxito
- **400:** Solicitud inválida
- **401:** No autorizado
- **403:** Prohibido
- **429:** Rate limit excedido
- **500:** Error interno del servidor

---

*Documentación generada automáticamente el 2025-10-28T19:38:27.907Z*
