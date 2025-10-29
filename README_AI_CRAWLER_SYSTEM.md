# 🤖 Sistema de Rastreo IA - evolve2digital.com

## 📋 Resumen

Sistema completo de configuración, monitoreo y seguridad para crawlers de IA (GPTBot, Google-Extended, ClaudeBot, etc.) implementado en Next.js con TypeScript.

### ✨ Características Principales

- 🎯 **Acceso Estratégico**: Permite acceso controlado a crawlers IA legítimos
- 📊 **Monitoreo Completo**: Logging detallado y métricas en tiempo real
- 🔒 **Seguridad Robusta**: Rate limiting, detección de anomalías y protección contra abusos
- 🏥 **Health Checks**: Verificación automática de accesibilidad
- 🚨 **Alertas**: Sistema de notificaciones para incidentes
- 📈 **APIs de Gestión**: Endpoints para administración y configuración

---

## 🚀 Inicio Rápido

### Verificar Estado del Sistema

```bash
# Comprobar que todo funciona
node scripts/monitor-ai-crawlers.js stats

# Probar acceso de GPTBot
curl -H "User-Agent: GPTBot/1.0" https://evolve2digital.com/es

# Verificar logs
tail -f logs/ai-crawlers/$(date +%Y-%m-%d).log
```

### Comandos Esenciales

```bash
# Monitoreo automático
node scripts/monitor-ai-crawlers.js monitor

# Estadísticas de seguridad
curl -X GET "http://localhost:3000/api/admin/ai-crawler-security?action=stats"

# Health check específico
curl -X GET "http://localhost:3000/api/admin/ai-crawler-monitor?action=health-check&crawler=GPTBot"
```

---

## 🏗️ Arquitectura

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

### Componentes Clave

| Componente | Archivo | Descripción |
|------------|---------|-------------|
| **Robots Config** | `app/robots.ts` | Configuración de permisos para crawlers |
| **Middleware** | `middleware.ts` | Interceptor de requests con seguridad |
| **AI Logger** | `lib/ai-crawler-logger.ts` | Sistema de logging especializado |
| **Monitor** | `lib/ai-crawler-monitor.ts` | Health checks y alertas |
| **Security** | `lib/ai-crawler-security.ts` | Rate limiting y protección |
| **Monitor Script** | `scripts/monitor-ai-crawlers.js` | Herramienta de monitoreo CLI |

---

## 🔧 Configuración

### Crawlers Soportados

| Crawler | User-Agent | Rate Limit | Estado |
|---------|------------|------------|--------|
| **GPTBot** | `GPTBot/1.0` | 30 req/min | ✅ Activo |
| **Google-Extended** | `Google-Extended/1.0` | 60 req/min | ✅ Activo |
| **ClaudeBot** | `ClaudeBot/1.0` | 30 req/min | ✅ Activo |
| **ChatGPT-User** | `ChatGPT-User/1.0` | 20 req/min | ✅ Activo |
| **Bingbot** | `Bingbot/2.0` | 40 req/min | ✅ Activo |

### Rutas Permitidas

```typescript
const allowedPaths = [
  '/',              // Página principal
  '/es/',           // Español
  '/en/',           // Inglés
  '/es/blog/',      // Blog español
  '/en/blog/',      // Blog inglés
  '/es/docs/',      // Documentación español
  '/en/docs/',      // Documentación inglés
  '/sitemap.xml',   // Sitemap
  '/rss.xml'        // RSS Feed
]
```

### Rutas Bloqueadas

```typescript
const disallowedPaths = [
  '/api/',          // APIs internas
  '/admin/',        // Panel de administración
  '/_next/',        // Archivos de Next.js
  '/private/',      // Contenido privado
  '/*.json$'        // Archivos JSON
]
```

---

## 📊 APIs de Administración

### Monitor API

```bash
# Estadísticas generales
GET /api/admin/ai-crawler-monitor?action=stats

# Health check específico
GET /api/admin/ai-crawler-monitor?action=health-check&crawler=GPTBot&url=https://evolve2digital.com/es

# Configuración actual
GET /api/admin/ai-crawler-monitor?action=config

# Ejecutar monitoreo completo
POST /api/admin/ai-crawler-monitor?action=run-cycle

# Probar crawler específico
POST /api/admin/ai-crawler-monitor?action=test-crawler
```

### Security API

```bash
# Estadísticas de seguridad
GET /api/admin/ai-crawler-security?action=stats

# Configuración de seguridad
GET /api/admin/ai-crawler-security?action=config

# Activar modo emergencia
POST /api/admin/ai-crawler-security?action=emergency-mode

# Gestionar blacklist
POST /api/admin/ai-crawler-security?action=blacklist

# Actualizar rate limits
POST /api/admin/ai-crawler-security?action=rate-limits

# Limpiar datos antiguos
DELETE /api/admin/ai-crawler-security?action=cleanup
```

---

## 🛠️ Instalación y Setup

### Requisitos

- Node.js 18+
- Next.js 14+
- TypeScript
- Permisos de escritura en `/logs/`

### Instalación

```bash
# 1. Los archivos ya están incluidos en el proyecto
# 2. Crear directorio de logs
mkdir -p logs/ai-crawlers

# 3. Hacer ejecutable el script de monitoreo
chmod +x scripts/monitor-ai-crawlers.js

# 4. Probar configuración
npm run dev
node scripts/monitor-ai-crawlers.js test
```

### Configuración de Producción

```bash
# 1. Configurar cron job para monitoreo automático
crontab -e
# Agregar: 0,30 * * * * /usr/bin/node /path/to/monitor-ai-crawlers.js monitor

# 2. Configurar rotación de logs (opcional)
# Agregar a logrotate.d/ai-crawlers:
# /path/to/logs/ai-crawlers/*.log {
#   daily
#   rotate 30
#   compress
#   delaycompress
#   missingok
#   notifempty
# }

# 3. Verificar permisos
chown -R www-data:www-data logs/ai-crawlers/
chmod 755 logs/ai-crawlers/
```

---

## 📈 Monitoreo y Métricas

### Métricas Clave

- **Success Rate**: >95% esperado
- **Response Time**: <2000ms promedio
- **Rate Limit Violations**: <10/día
- **Security Violations**: 0 críticas
- **Active Crawlers**: 3-5 simultáneos

### Comandos de Monitoreo

```bash
# Dashboard rápido
node scripts/monitor-ai-crawlers.js stats

# Logs en tiempo real
tail -f logs/ai-crawlers/$(date +%Y-%m-%d).log

# Estadísticas de seguridad
curl -s -X GET "http://localhost:3000/api/admin/ai-crawler-security?action=stats" | jq

# Health check manual
curl -H "User-Agent: GPTBot/1.0" -v https://evolve2digital.com/es
```

### Alertas Automáticas

El sistema genera alertas cuando:
- Success rate <95%
- Response time >5000ms
- >10 errores por hora
- Violaciones de seguridad críticas
- Health checks fallan consecutivamente

---

## 🚨 Troubleshooting

### Problemas Comunes

#### 1. Crawler No Puede Acceder (403/404)

```bash
# Verificar robots.txt
curl https://evolve2digital.com/robots.txt

# Comprobar blacklist
curl -s -X GET "/api/admin/ai-crawler-security?action=config" | jq '.data.ipBlacklist'

# Probar acceso manual
curl -H "User-Agent: GPTBot/1.0" -v https://evolve2digital.com/es
```

#### 2. Rate Limiting Excesivo (429)

```bash
# Revisar límites actuales
curl -s -X GET "/api/admin/ai-crawler-security?action=config" | jq '.data.crawlerRateLimits'

# Aumentar límites temporalmente
curl -X POST "/api/admin/ai-crawler-security?action=rate-limits" \
  -H "Content-Type: application/json" \
  -d '{"crawlerType": "GPTBot", "limits": {"requestsPerMinute": 100}}'
```

#### 3. Logs No Se Generan

```bash
# Verificar permisos
ls -la logs/ai-crawlers/

# Comprobar middleware
grep "AI-CRAWLER" logs/application.log

# Probar logging manual
curl -H "User-Agent: GPTBot/1.0" https://evolve2digital.com/es
tail -1 logs/ai-crawlers/$(date +%Y-%m-%d).log
```

### Diagnóstico Rápido

```bash
# Script de diagnóstico completo
cat > scripts/diagnose.sh << 'EOF'
#!/bin/bash
echo "=== DIAGNÓSTICO SISTEMA AI CRAWLER ==="
echo "1. Estado del servidor:"
curl -I https://evolve2digital.com/ 2>/dev/null | head -1

echo "2. Robots.txt:"
curl -s https://evolve2digital.com/robots.txt | grep -E "(GPTBot|Allow|Disallow)" | head -5

echo "3. Middleware activo:"
curl -H "User-Agent: GPTBot/1.0" -I https://evolve2digital.com/es 2>/dev/null | head -1

echo "4. Logs del día:"
ls -la logs/ai-crawlers/$(date +%Y-%m-%d).log 2>/dev/null || echo "❌ No hay logs hoy"

echo "5. API de monitoreo:"
curl -s -X GET "http://localhost:3000/api/admin/ai-crawler-monitor?action=stats" >/dev/null 2>&1 && echo "✅ API responde" || echo "❌ API no responde"

echo "=== FIN DIAGNÓSTICO ==="
EOF

chmod +x scripts/diagnose.sh
./scripts/diagnose.sh
```

---

## 🔒 Seguridad

### Medidas Implementadas

- **Rate Limiting**: Límites por crawler y por IP
- **Blacklist/Whitelist**: Control de IPs
- **Detección de Anomalías**: Patrones sospechosos
- **Modo Emergencia**: Bloqueo temporal en caso de ataques
- **Logging Seguro**: Rotación automática y cumplimiento GDPR

### Configuración de Seguridad

```typescript
const securityConfig = {
  rateLimits: {
    'GPTBot': { requestsPerMinute: 30, burstLimit: 10 },
    'Google-Extended': { requestsPerMinute: 60, burstLimit: 15 }
  },
  anomalyPatterns: ['/admin', '/.env', '/wp-admin'],
  emergencyMode: { enabled: false, maxRequestsPerMinute: 5 }
}
```

### Respuesta a Incidentes

```bash
# Activar modo emergencia
curl -X POST "/api/admin/ai-crawler-security?action=emergency-mode" \
  -d '{"enabled": true, "maxRequestsPerMinute": 5}'

# Bloquear IP problemática
curl -X POST "/api/admin/ai-crawler-security?action=blacklist" \
  -d '{"ip": "MALICIOUS_IP", "operation": "add"}'

# Limpiar violaciones
curl -X DELETE "/api/admin/ai-crawler-security?action=cleanup"
```

---

## 📚 Documentación Adicional

### Archivos de Documentación

- [`docs/AI_CRAWLER_CONFIGURATION.md`](docs/AI_CRAWLER_CONFIGURATION.md) - Configuración técnica completa
- [`docs/OPERATIONAL_PROCEDURES.md`](docs/OPERATIONAL_PROCEDURES.md) - Procedimientos operativos diarios
- Este archivo - Guía de inicio rápido

### Referencias Externas

- [OpenAI GPTBot Documentation](https://platform.openai.com/docs/gptbot)
- [Google Extended Crawler](https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers)
- [Anthropic Claude Bot](https://docs.anthropic.com/claude/docs)

### Estructura de Archivos

```
├── app/
│   └── robots.ts                           # Configuración robots.txt
├── middleware.ts                           # Middleware principal
├── lib/
│   ├── ai-crawler-logger.ts               # Sistema de logging
│   ├── ai-crawler-monitor.ts              # Monitoreo y health checks
│   └── ai-crawler-security.ts             # Seguridad y rate limiting
├── app/api/admin/
│   ├── ai-crawler-monitor/route.ts        # API de monitoreo
│   └── ai-crawler-security/route.ts       # API de seguridad
├── scripts/
│   └── monitor-ai-crawlers.js             # Script de monitoreo CLI
├── logs/
│   └── ai-crawlers/                       # Logs de crawlers IA
└── docs/
    ├── AI_CRAWLER_CONFIGURATION.md        # Documentación técnica
    └── OPERATIONAL_PROCEDURES.md          # Procedimientos operativos
```

---

## 🤝 Contribución

### Agregar Nuevo Crawler

1. Actualizar `lib/ai-crawler-security.ts`:
```typescript
const DEFAULT_SECURITY_CONFIG = {
  crawlerRateLimits: {
    'NewBot': {
      requestsPerMinute: 30,
      requestsPerHour: 1000,
      requestsPerDay: 10000,
      burstLimit: 10
    }
  }
}
```

2. Actualizar `app/robots.ts`:
```typescript
const aiCrawlers = ['GPTBot', 'Google-Extended', 'ClaudeBot', 'NewBot']
```

3. Probar configuración:
```bash
curl -H "User-Agent: NewBot/1.0" https://evolve2digital.com/es
```

### Modificar Rate Limits

```bash
curl -X POST "/api/admin/ai-crawler-security?action=rate-limits" \
  -H "Content-Type: application/json" \
  -d '{
    "crawlerType": "GPTBot",
    "limits": {
      "requestsPerMinute": 50,
      "requestsPerHour": 2000
    }
  }'
```

---

## 📞 Soporte

### Contactos

- **Desarrollo**: Equipo de desarrollo
- **Operaciones**: DevOps team
- **Seguridad**: Security team

### Escalación

| Severidad | Tiempo | Criterios |
|-----------|--------|-----------|
| **P1** | 15 min | Sitio inaccesible, brecha de seguridad |
| **P2** | 2 horas | Rate limiting excesivo, health checks fallando |
| **P3** | 24 horas | Optimizaciones, ajustes |
| **P4** | 72 horas | Mejoras, documentación |

---

## 📊 Estado del Sistema

### Última Verificación
- **Fecha**: Enero 2024
- **Estado**: ✅ Operacional
- **Versión**: 1.0.0
- **Crawlers Activos**: 5
- **Success Rate**: >99%

### Próximas Mejoras
- 🔄 Dashboard web de administración
- 🔄 Integración con sistemas de alertas externos
- 🔄 Análisis de contenido indexado
- 🔄 Métricas de SEO para IA

---

**🚀 Sistema listo para producción**  
**📈 Monitoreo activo 24/7**  
**🔒 Seguridad robusta implementada**