# Configuración de Rastreo IA - Documentación Técnica

## 📋 Resumen Ejecutivo

Este documento describe la implementación completa del sistema de configuración, monitoreo y seguridad para crawlers de IA (GPTBot, Google-Extended, ClaudeBot, etc.) en el sitio web evolve2digital.com.

### 🎯 Objetivos Alcanzados

- ✅ **Acceso estratégico**: GPTBot y otros crawlers IA pueden acceder al contenido público
- ✅ **Monitoreo completo**: Todas las interacciones quedan registradas y auditables
- ✅ **Seguridad robusta**: Rate limiting, detección de anomalías y protección contra abusos
- ✅ **Verificación automática**: Sistema de health checks y alertas en tiempo real
- ✅ **Cumplimiento GDPR**: Gestión segura de logs y rotación automática

---

## 🏗️ Arquitectura del Sistema

### Componentes Principales

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   robots.txt    │    │   Middleware     │    │   AI Logger     │
│   (Permisos)    │───▶│   (Seguridad)    │───▶│   (Registro)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Monitor API   │    │   Security API   │    │   Health Check  │
│   (Estadísticas)│    │   (Configuración)│    │   (Verificación)│
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Flujo de Procesamiento

1. **Request Inicial**: Crawler IA realiza petición HTTP
2. **Identificación**: Middleware detecta User-Agent de IA
3. **Análisis de Seguridad**: Verificación de rate limits, blacklist, patrones sospechosos
4. **Logging**: Registro detallado de la interacción
5. **Respuesta**: Entrega de contenido o bloqueo según políticas

---

## 🔧 Configuración de Crawlers IA

### robots.txt Optimizado

**Ubicación**: `/app/robots.ts`

```typescript
// Configuración actual para crawlers IA
const aiCrawlers = [
  'GPTBot',           // OpenAI GPT
  'Google-Extended',  // Google Gemini
  'ClaudeBot',        // Anthropic Claude
  'ChatGPT-User',     // ChatGPT Plus
  'Bingbot'           // Microsoft Bing
]

// Rutas permitidas
const allowedPaths = [
  '/',
  '/es/',
  '/en/',
  '/es/blog/',
  '/en/blog/',
  '/es/docs/',
  '/en/docs/',
  '/sitemap.xml',
  '/rss.xml'
]

// Rutas bloqueadas
const disallowedPaths = [
  '/api/',
  '/admin/',
  '/_next/',
  '/private/',
  '/*.json$'
]
```

### Crawlers Soportados

| Crawler | Descripción | Rate Limit | Estado |
|---------|-------------|------------|--------|
| **GPTBot** | OpenAI GPT-4/ChatGPT | 30 req/min | ✅ Activo |
| **Google-Extended** | Google Gemini/Bard | 60 req/min | ✅ Activo |
| **ClaudeBot** | Anthropic Claude | 30 req/min | ✅ Activo |
| **ChatGPT-User** | ChatGPT Plus users | 20 req/min | ✅ Activo |
| **Bingbot** | Microsoft Bing Chat | 40 req/min | ✅ Activo |

---

## 📊 Sistema de Logging y Monitoreo

### Estructura de Logs

**Ubicación**: `/logs/ai-crawlers/`

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "crawlerType": "GPTBot",
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.0",
  "method": "GET",
  "path": "/es/blog/post-ejemplo",
  "statusCode": 200,
  "responseTime": 245,
  "referer": null,
  "contentLength": 15420
}
```

### Métricas Disponibles

- **Requests totales** por crawler
- **Tiempo de respuesta promedio**
- **Códigos de estado HTTP**
- **Rutas más accedidas**
- **Patrones de acceso temporal**
- **Violaciones de seguridad**

### APIs de Monitoreo

#### GET /api/admin/ai-crawler-monitor

```bash
# Obtener estadísticas generales
curl -X GET "https://evolve2digital.com/api/admin/ai-crawler-monitor?action=stats"

# Realizar health check específico
curl -X GET "https://evolve2digital.com/api/admin/ai-crawler-monitor?action=health-check&crawler=GPTBot&url=https://evolve2digital.com/es"

# Obtener configuración actual
curl -X GET "https://evolve2digital.com/api/admin/ai-crawler-monitor?action=config"
```

#### POST /api/admin/ai-crawler-monitor

```bash
# Ejecutar ciclo de monitoreo completo
curl -X POST "https://evolve2digital.com/api/admin/ai-crawler-monitor?action=run-cycle" \
  -H "Content-Type: application/json" \
  -d '{"config": {"checkInterval": 30}}'

# Probar crawler específico
curl -X POST "https://evolve2digital.com/api/admin/ai-crawler-monitor?action=test-crawler" \
  -H "Content-Type: application/json" \
  -d '{"crawlerType": "GPTBot", "url": "https://evolve2digital.com/es/blog"}'
```

---

## 🔒 Sistema de Seguridad

### Rate Limiting

**Configuración por Crawler**:

```typescript
const rateLimits = {
  'GPTBot': {
    requestsPerMinute: 30,
    requestsPerHour: 1000,
    requestsPerDay: 10000,
    burstLimit: 10
  },
  'Google-Extended': {
    requestsPerMinute: 60,
    requestsPerHour: 2000,
    requestsPerDay: 20000,
    burstLimit: 15
  }
  // ... otros crawlers
}
```

### Detección de Anomalías

- **Patrones sospechosos**: `/admin`, `/.env`, `/wp-admin`, etc.
- **Velocidad excesiva**: >10 requests/segundo
- **Requests concurrentes**: >5 simultáneas
- **IPs en blacklist**: Bloqueo automático

### Códigos de Respuesta de Seguridad

| Código | Descripción | Acción |
|--------|-------------|--------|
| **200** | Acceso permitido | Contenido entregado |
| **403** | IP en blacklist | Acceso denegado |
| **404** | Patrón sospechoso | Ocultar existencia |
| **429** | Rate limit excedido | Esperar y reintentar |
| **503** | Modo emergencia | Servicio no disponible |

### API de Seguridad

#### GET /api/admin/ai-crawler-security

```bash
# Obtener estadísticas de seguridad
curl -X GET "https://evolve2digital.com/api/admin/ai-crawler-security?action=stats"

# Obtener configuración de seguridad
curl -X GET "https://evolve2digital.com/api/admin/ai-crawler-security?action=config"
```

#### POST /api/admin/ai-crawler-security

```bash
# Activar modo emergencia
curl -X POST "https://evolve2digital.com/api/admin/ai-crawler-security?action=emergency-mode" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "allowedCrawlers": ["GPTBot"], "maxRequestsPerMinute": 5}'

# Agregar IP a blacklist
curl -X POST "https://evolve2digital.com/api/admin/ai-crawler-security?action=blacklist" \
  -H "Content-Type: application/json" \
  -d '{"ip": "192.168.1.100", "operation": "add"}'

# Actualizar rate limits
curl -X POST "https://evolve2digital.com/api/admin/ai-crawler-security?action=rate-limits" \
  -H "Content-Type: application/json" \
  -d '{"crawlerType": "GPTBot", "limits": {"requestsPerMinute": 50}}'
```

---

## 🤖 Verificación Automática

### Script de Monitoreo

**Ubicación**: `/scripts/monitor-ai-crawlers.js`

```bash
# Ejecutar manualmente
node scripts/monitor-ai-crawlers.js monitor

# Obtener estadísticas
node scripts/monitor-ai-crawlers.js stats

# Modo de prueba
node scripts/monitor-ai-crawlers.js test
```

### Configuración de Cron Jobs

```bash
# Cada 30 minutos
0,30 * * * * /usr/bin/node /path/to/monitor-ai-crawlers.js monitor

# Cada hora (alternativa)
0 * * * * /usr/bin/node /path/to/monitor-ai-crawlers.js monitor

# Cada 6 horas (para sitios de bajo tráfico)
0 0,6,12,18 * * * /usr/bin/node /path/to/monitor-ai-crawlers.js monitor
```

### Health Checks Automáticos

El sistema verifica automáticamente:

- **Accesibilidad**: ¿Pueden los crawlers acceder al sitio?
- **Tiempo de respuesta**: ¿Está el sitio respondiendo rápidamente?
- **Contenido**: ¿Se está sirviendo el contenido correcto?
- **Errores**: ¿Hay errores 4xx o 5xx?

### Alertas y Notificaciones

```javascript
// Configuración de alertas
const alertThresholds = {
  maxResponseTime: 5000,     // 5 segundos
  minSuccessRate: 95,        // 95%
  maxErrorsPerHour: 10       // 10 errores/hora
}

// Webhook para notificaciones (opcional)
const webhookUrl = process.env.WEBHOOK_URL
```

---

## 📈 Procedimientos Operativos

### Monitoreo Diario

1. **Revisar Dashboard**: Acceder a estadísticas de crawlers
2. **Verificar Alertas**: Comprobar notificaciones de errores
3. **Analizar Patrones**: Identificar tendencias de acceso
4. **Revisar Logs**: Buscar actividad sospechosa

### Mantenimiento Semanal

1. **Limpiar Logs Antiguos**: Ejecutar cleanup automático
2. **Revisar Rate Limits**: Ajustar según patrones de uso
3. **Actualizar Blacklist**: Agregar/remover IPs problemáticas
4. **Verificar Health Checks**: Confirmar funcionamiento correcto

### Respuesta a Incidentes

#### Tráfico Excesivo

```bash
# Activar modo emergencia
curl -X POST "/api/admin/ai-crawler-security?action=emergency-mode" \
  -d '{"enabled": true, "maxRequestsPerMinute": 5}'
```

#### Crawler Problemático

```bash
# Bloquear IP específica
curl -X POST "/api/admin/ai-crawler-security?action=blacklist" \
  -d '{"ip": "PROBLEMATIC_IP", "operation": "add"}'
```

#### Reducir Rate Limits

```bash
# Reducir límites temporalmente
curl -X POST "/api/admin/ai-crawler-security?action=rate-limits" \
  -d '{"crawlerType": "GPTBot", "limits": {"requestsPerMinute": 10}}'
```

---

## 🔍 Troubleshooting

### Problemas Comunes

#### 1. Crawler No Puede Acceder

**Síntomas**: Health checks fallan, 403/404 errors
**Solución**:
```bash
# Verificar robots.txt
curl https://evolve2digital.com/robots.txt

# Verificar si IP está en blacklist
curl -X GET "/api/admin/ai-crawler-security?action=stats"

# Probar acceso manual
curl -H "User-Agent: GPTBot/1.0" https://evolve2digital.com/es
```

#### 2. Rate Limiting Excesivo

**Síntomas**: Muchos 429 errors en logs
**Solución**:
```bash
# Aumentar límites temporalmente
curl -X POST "/api/admin/ai-crawler-security?action=rate-limits" \
  -d '{"crawlerType": "GPTBot", "limits": {"requestsPerMinute": 100}}'
```

#### 3. Logs No Se Generan

**Síntomas**: Archivos de log vacíos
**Solución**:
1. Verificar permisos de escritura en `/logs/`
2. Comprobar que el middleware está activo
3. Revisar configuración de logging

#### 4. Health Checks Fallan

**Síntomas**: Script de monitoreo reporta errores
**Solución**:
1. Verificar conectividad de red
2. Comprobar certificados SSL
3. Revisar configuración de firewall

### Comandos de Diagnóstico

```bash
# Verificar estado del sistema
node scripts/monitor-ai-crawlers.js stats

# Probar crawler específico
curl -H "User-Agent: GPTBot/1.0" -v https://evolve2digital.com/es/blog

# Revisar logs recientes
tail -f logs/ai-crawlers/$(date +%Y-%m-%d).log

# Verificar middleware
grep "AI-CRAWLER" logs/application.log

# Comprobar rate limiting
curl -X GET "/api/admin/ai-crawler-security?action=stats" | jq '.data.crawlerMetrics'
```

---

## 📚 Referencias Técnicas

### Archivos de Configuración

- `/app/robots.ts` - Configuración de robots.txt
- `/middleware.ts` - Middleware de seguridad y logging
- `/lib/ai-crawler-logger.ts` - Sistema de logging
- `/lib/ai-crawler-monitor.ts` - Sistema de monitoreo
- `/lib/ai-crawler-security.ts` - Sistema de seguridad

### APIs Disponibles

- `/api/admin/ai-crawler-monitor` - Monitoreo y health checks
- `/api/admin/ai-crawler-security` - Configuración de seguridad

### Scripts de Utilidad

- `/scripts/monitor-ai-crawlers.js` - Monitoreo automático

### Documentación Externa

- [OpenAI GPTBot](https://platform.openai.com/docs/gptbot)
- [Google Extended](https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers)
- [Anthropic Claude](https://docs.anthropic.com/claude/docs)

---

## 🔄 Changelog y Versiones

### v1.0.0 (Enero 2024)
- ✅ Implementación inicial del sistema de rastreo IA
- ✅ Configuración de robots.txt optimizado
- ✅ Sistema de logging y monitoreo
- ✅ Middleware de seguridad con rate limiting
- ✅ APIs de administración
- ✅ Script de monitoreo automático
- ✅ Documentación completa

### Próximas Mejoras (v1.1.0)
- 🔄 Dashboard web para administración
- 🔄 Integración con sistemas de alertas externos
- 🔄 Análisis de contenido indexado
- 🔄 Métricas de SEO para IA

---

## 📞 Soporte y Contacto

Para soporte técnico o consultas sobre la configuración:

- **Documentación**: Este archivo
- **Logs**: `/logs/ai-crawlers/`
- **APIs**: Endpoints de administración disponibles
- **Monitoreo**: Script automático configurado

**Última actualización**: Enero 2024  
**Versión del sistema**: 1.0.0  
**Estado**: ✅ Producción