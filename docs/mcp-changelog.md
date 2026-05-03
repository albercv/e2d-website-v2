# MCP Changelog

## Historial de Cambios del Servidor MCP

## 2026-05-02

- **Nueva tool**: `posts.rebuild` — dispara rebuild+restart del sitio. Scope `posts:write`. Rate-limit 3/min. Devuelve 200 inmediato; el build es asíncrono (1-3 min).
- **`posts.create`**: nuevo parámetro opcional `skip_rebuild` (default `false`). Si `true`, no dispara rebuild automático tras crear el post. Útil para encadenar varias creaciones (ej. multi-idioma) y disparar un solo rebuild al final via `posts.rebuild`.

### v1.0.0 - 2026-05-02

#### Añadido
- Servidor MCP inicial con protocolo 1.0
- Herramienta `agent.query` para consultas al agente IA
- Herramienta `posts.search` para búsqueda de artículos
- Herramienta `appointments.create` para crear citas
- Endpoint de manifest MCP
- Endpoint de logs administrativos
- Sistema de rate limiting
- Logging completo de actividad
- Documentación automática

#### Características
- Soporte para múltiples modelos de IA (GPT-4, Claude, Gemini)
- Respuestas multiidioma (español/inglés)
- Rate limiting por IP
- Autenticación básica para endpoints admin
- Headers CORS optimizados para IA
- Cache inteligente de respuestas
- Métricas de rendimiento

#### Seguridad
- Rate limiting por endpoint
- Validación de entrada
- Sanitización de datos
- Headers de seguridad
- Logging de actividad sospechosa

---

*Changelog generado automáticamente el 2026-05-02T09:58:38.264Z*
