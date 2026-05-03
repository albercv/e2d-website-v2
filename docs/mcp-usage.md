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
**Métodos:** OPTIONS, GET, POST, PUT, DELETE, PATCH
**Categoría:** general
**Acceso:** Público





### POST /api/mcp/tools/agent/query

**Descripción:** MCP Tool: agent.query Expone el agente IA externo de E2D públicamente a través del protocolo MCP. Permite a modelos externos (ChatGPT, Claude) consultar al agente E2D.

**Ruta:** `POST /api/mcp/tools/agent/query`
**Métodos:** POST, OPTIONS
**Categoría:** general






### appointments.create

**Descripción:** MCP Tool: appointments.create Herramienta MCP para crear citas o solicitudes de contacto. Permite a los modelos de IA programar reuniones o enviar solicitudes de contacto estructuradas.

**Ruta:** `POST /api/mcp/tools/appointments/create`
**Métodos:** OPTIONS, POST, GET, GET, GET, GET
**Categoría:** actions






### fetch

**Descripción:** MCP Wrapper Tool: fetch Endpoint MCP estándar para recuperación (POST) que formatea la salida en content[] y mantiene compatibilidad dual (MCP y JSON clásico) usando lib/mcp-format. Reutiliza la lógica de posts.get y admite entrada por slug+locale o url.

**Ruta:** `POST /api/mcp/tools/fetch`
**Métodos:** OPTIONS, POST, POST, POST, POST
**Categoría:** mcp






### posts.search

**Descripción:** MCP Tool: posts.search Herramienta MCP para buscar artículos del blog que coincidan con una consulta textual. Reutiliza la lógica del ai-answers-service pero devuelve múltiples resultados estructurados para consumo por modelos de IA.

**Ruta:** `GET /api/mcp/tools/posts/search`
**Métodos:** OPTIONS, GET, POST, POST, POST, POST
**Categoría:** content






### Flujo multi-idioma desde Claude.ai

Para publicar un post en es/en/it desde Claude.ai web (Custom Connector):

1. Llamar `posts.create` 3 veces (una por idioma) con `skip_rebuild: true`. Esto crea los 3 ficheros MDX sin disparar rebuild.
2. Llamar `posts.rebuild` una sola vez al final. Dispara el build+restart asíncrono.

El build tarda 1-3 minutos. Tras completarse, las 3 URLs `/es/blog/<slug>`, `/en/blog/<slug>`, `/it/blog/<slug>` servirán los nuevos posts.

Si una de las 3 creaciones falla (p.ej. 409 por colisión de slug), las otras 2 se conservan en disco. Reintenta solo la que falló y luego `posts.rebuild`.

### search

**Descripción:** MCP Wrapper Tool: search Endpoint MCP estándar para búsqueda (POST) que formatea la salida en content[] y mantiene compatibilidad dual (MCP y JSON clásico) usando lib/mcp-format. Reutiliza la lógica de posts.search (filtrado y scoring) sobre Contentlayer.

**Ruta:** `POST /api/mcp/tools/search`
**Métodos:** OPTIONS, POST, POST, POST, POST
**Categoría:** mcp







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

*Documentación generada automáticamente el 2026-05-02T09:58:38.264Z*
