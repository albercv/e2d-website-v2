# Procedimientos Operativos - Sistema de Rastreo IA

## 🎯 Guía de Operaciones Diarias

### ✅ Checklist Diario (5 minutos)

```bash
# 1. Verificar estado general del sistema
node scripts/monitor-ai-crawlers.js stats

# 2. Revisar logs del día actual
tail -n 50 logs/ai-crawlers/$(date +%Y-%m-%d).log

# 3. Comprobar alertas de seguridad
curl -s -X GET "http://localhost:3000/api/admin/ai-crawler-security?action=stats" | jq '.data.recentViolations'

# 4. Verificar health checks
curl -s -X GET "http://localhost:3000/api/admin/ai-crawler-monitor?action=stats" | jq '.data.healthStatus'
```

### 📊 Dashboard de Métricas Clave

Revisar diariamente estos indicadores:

| Métrica | Valor Esperado | Acción si Fuera de Rango |
|---------|----------------|--------------------------|
| **Success Rate** | >95% | Investigar errores 4xx/5xx |
| **Avg Response Time** | <2000ms | Optimizar rendimiento |
| **Rate Limit Violations** | <10/día | Ajustar límites |
| **Security Violations** | 0 | Revisar patrones sospechosos |
| **Active Crawlers** | 3-5 | Verificar configuración |

---

## 🔧 Procedimientos de Mantenimiento

### Semanal (15 minutos)

#### 1. Limpieza de Logs

```bash
# Ejecutar limpieza automática (mantiene últimos 30 días)
curl -X DELETE "http://localhost:3000/api/admin/ai-crawler-security?action=cleanup"

# Verificar espacio en disco
du -sh logs/ai-crawlers/
```

#### 2. Análisis de Tendencias

```bash
# Generar reporte semanal
node scripts/monitor-ai-crawlers.js stats > reports/weekly-$(date +%Y-%m-%d).json

# Revisar crawlers más activos
grep -c "GPTBot" logs/ai-crawlers/*.log | sort -t: -k2 -nr | head -5
```

#### 3. Optimización de Rate Limits

```bash
# Revisar violaciones por crawler
curl -s -X GET "http://localhost:3000/api/admin/ai-crawler-security?action=stats" | \
  jq '.data.crawlerMetrics | to_entries[] | select(.value.rateLimitViolations > 0)'

# Ajustar límites si es necesario (ejemplo para GPTBot)
curl -X POST "http://localhost:3000/api/admin/ai-crawler-security?action=rate-limits" \
  -H "Content-Type: application/json" \
  -d '{"crawlerType": "GPTBot", "limits": {"requestsPerMinute": 40}}'
```

### Mensual (30 minutos)

#### 1. Auditoría Completa

```bash
# Generar reporte mensual completo
{
  echo "=== REPORTE MENSUAL - $(date) ==="
  echo ""
  echo "1. ESTADÍSTICAS GENERALES:"
  node scripts/monitor-ai-crawlers.js stats
  echo ""
  echo "2. SEGURIDAD:"
  curl -s -X GET "http://localhost:3000/api/admin/ai-crawler-security?action=stats"
  echo ""
  echo "3. HEALTH CHECKS:"
  curl -s -X GET "http://localhost:3000/api/admin/ai-crawler-monitor?action=stats"
} > reports/monthly-$(date +%Y-%m).txt
```

#### 2. Revisión de Configuración

```bash
# Backup de configuración actual
cp middleware.ts backups/middleware-$(date +%Y-%m-%d).ts
cp lib/ai-crawler-security.ts backups/ai-crawler-security-$(date +%Y-%m-%d).ts

# Verificar configuración de robots.txt
curl https://evolve2digital.com/robots.txt > backups/robots-$(date +%Y-%m-%d).txt
```

#### 3. Actualización de Blacklist

```bash
# Revisar IPs con múltiples violaciones
curl -s -X GET "http://localhost:3000/api/admin/ai-crawler-security?action=stats" | \
  jq '.data.ipViolations | to_entries[] | select(.value > 10)'

# Agregar IPs problemáticas a blacklist (ejemplo)
# curl -X POST "http://localhost:3000/api/admin/ai-crawler-security?action=blacklist" \
#   -H "Content-Type: application/json" \
#   -d '{"ip": "PROBLEMATIC_IP", "operation": "add"}'
```

---

## 🚨 Procedimientos de Emergencia

### Escenario 1: Tráfico Excesivo de Crawlers

**Síntomas**: 
- CPU/memoria alta
- Tiempos de respuesta >5s
- Múltiples 429 errors

**Respuesta Inmediata** (2 minutos):

```bash
# 1. Activar modo emergencia
curl -X POST "http://localhost:3000/api/admin/ai-crawler-security?action=emergency-mode" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "allowedCrawlers": ["GPTBot"],
    "maxRequestsPerMinute": 5,
    "reason": "High traffic emergency"
  }'

# 2. Verificar activación
curl -s -X GET "http://localhost:3000/api/admin/ai-crawler-security?action=config" | \
  jq '.data.emergencyMode'

# 3. Monitorear mejora
watch -n 30 'curl -s -X GET "http://localhost:3000/api/admin/ai-crawler-monitor?action=stats" | jq ".data.responseTime"'
```

**Investigación** (10 minutos):

```bash
# Identificar crawler problemático
tail -n 100 logs/ai-crawlers/$(date +%Y-%m-%d).log | \
  grep -E "(429|503)" | \
  cut -d'"' -f8 | sort | uniq -c | sort -nr

# Revisar patrones de IP
tail -n 100 logs/ai-crawlers/$(date +%Y-%m-%d).log | \
  grep -E "(429|503)" | \
  cut -d'"' -f6 | sort | uniq -c | sort -nr
```

**Resolución**:

```bash
# Desactivar modo emergencia cuando se estabilice
curl -X POST "http://localhost:3000/api/admin/ai-crawler-security?action=emergency-mode" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

### Escenario 2: Crawler Malicioso

**Síntomas**:
- Requests a rutas sensibles (/admin, /.env)
- Velocidad excesiva (>100 req/min)
- User-Agent sospechoso

**Respuesta Inmediata**:

```bash
# 1. Identificar IP problemática
tail -n 200 logs/ai-crawlers/$(date +%Y-%m-%d).log | \
  grep -E "(admin|\.env|wp-admin)" | \
  cut -d'"' -f6 | sort | uniq -c | sort -nr

# 2. Bloquear IP inmediatamente
MALICIOUS_IP="192.168.1.100"  # Reemplazar con IP real
curl -X POST "http://localhost:3000/api/admin/ai-crawler-security?action=blacklist" \
  -H "Content-Type: application/json" \
  -d "{\"ip\": \"$MALICIOUS_IP\", \"operation\": \"add\"}"

# 3. Verificar bloqueo
curl -s -X GET "http://localhost:3000/api/admin/ai-crawler-security?action=config" | \
  jq ".data.ipBlacklist[] | select(. == \"$MALICIOUS_IP\")"
```

### Escenario 3: Health Checks Fallando

**Síntomas**:
- Script de monitoreo reporta errores
- Crawlers legítimos no pueden acceder
- Success rate <90%

**Diagnóstico**:

```bash
# 1. Probar acceso manual
curl -H "User-Agent: GPTBot/1.0" -v https://evolve2digital.com/es

# 2. Verificar robots.txt
curl -v https://evolve2digital.com/robots.txt

# 3. Comprobar middleware
grep -n "AI-CRAWLER" logs/application.log | tail -10

# 4. Revisar configuración de seguridad
curl -s -X GET "http://localhost:3000/api/admin/ai-crawler-security?action=config" | \
  jq '.data.emergencyMode, .data.ipBlacklist'
```

**Resolución**:

```bash
# Si hay bloqueos incorrectos, limpiar blacklist
curl -X DELETE "http://localhost:3000/api/admin/ai-crawler-security?action=cleanup"

# Reiniciar configuración de seguridad si es necesario
curl -X POST "http://localhost:3000/api/admin/ai-crawler-security?action=reset-config"
```

---

## 📋 Checklists de Verificación

### Pre-Deployment

```bash
# ✅ Verificar configuración de robots.txt
curl https://evolve2digital.com/robots.txt | grep -E "(GPTBot|Google-Extended|ClaudeBot)"

# ✅ Probar middleware en desarrollo
npm run dev
curl -H "User-Agent: GPTBot/1.0" http://localhost:3000/es

# ✅ Verificar APIs de administración
curl -X GET "http://localhost:3000/api/admin/ai-crawler-monitor?action=config"
curl -X GET "http://localhost:3000/api/admin/ai-crawler-security?action=config"

# ✅ Probar script de monitoreo
node scripts/monitor-ai-crawlers.js test

# ✅ Verificar permisos de logs
ls -la logs/ai-crawlers/
```

### Post-Deployment

```bash
# ✅ Verificar acceso de crawlers en producción
curl -H "User-Agent: GPTBot/1.0" https://evolve2digital.com/es
curl -H "User-Agent: Google-Extended/1.0" https://evolve2digital.com/en

# ✅ Comprobar logging activo
tail -f logs/ai-crawlers/$(date +%Y-%m-%d).log &
curl -H "User-Agent: GPTBot/1.0" https://evolve2digital.com/es/blog
# Verificar que aparece el log

# ✅ Probar rate limiting
for i in {1..35}; do
  curl -H "User-Agent: GPTBot/1.0" https://evolve2digital.com/es &
done
# Verificar que algunos requests reciben 429

# ✅ Configurar cron job
crontab -l | grep monitor-ai-crawlers
```

### Troubleshooting Rápido

```bash
# 🔍 Verificar si el sistema está funcionando
echo "=== DIAGNÓSTICO RÁPIDO ==="

# 1. Estado del servidor
curl -I https://evolve2digital.com/

# 2. Robots.txt accesible
curl -s https://evolve2digital.com/robots.txt | head -5

# 3. Middleware activo
curl -H "User-Agent: GPTBot/1.0" -I https://evolve2digital.com/es

# 4. Logs generándose
ls -la logs/ai-crawlers/$(date +%Y-%m-%d).log 2>/dev/null || echo "❌ No hay logs hoy"

# 5. APIs respondiendo
curl -s -X GET "http://localhost:3000/api/admin/ai-crawler-monitor?action=stats" | \
  jq '.success' 2>/dev/null || echo "❌ API no responde"

echo "=== FIN DIAGNÓSTICO ==="
```

---

## 📊 Métricas y KPIs

### Indicadores Clave de Rendimiento

| KPI | Objetivo | Medición | Frecuencia |
|-----|----------|----------|------------|
| **Disponibilidad para IA** | >99% | Health checks exitosos | Continua |
| **Tiempo de Respuesta** | <2s | Promedio de response time | Diaria |
| **Cobertura de Contenido** | >95% | URLs indexables accesibles | Semanal |
| **Seguridad** | 0 violaciones críticas | Intentos de acceso malicioso | Diaria |
| **Eficiencia de Rate Limiting** | <5% de 429 errors | Requests bloqueados vs totales | Diaria |

### Reportes Automáticos

```bash
# Configurar reporte diario por email (opcional)
# Agregar a crontab:
# 0 9 * * * /path/to/daily-report.sh | mail -s "AI Crawler Daily Report" admin@evolve2digital.com

# Script de reporte diario
cat > scripts/daily-report.sh << 'EOF'
#!/bin/bash
echo "=== REPORTE DIARIO AI CRAWLERS - $(date) ==="
echo ""
echo "📊 ESTADÍSTICAS:"
node scripts/monitor-ai-crawlers.js stats | head -20
echo ""
echo "🔒 SEGURIDAD:"
curl -s -X GET "http://localhost:3000/api/admin/ai-crawler-security?action=stats" | jq '.data.todayViolations'
echo ""
echo "🏥 HEALTH STATUS:"
curl -s -X GET "http://localhost:3000/api/admin/ai-crawler-monitor?action=stats" | jq '.data.healthStatus'
EOF

chmod +x scripts/daily-report.sh
```

---

## 🔄 Procedimientos de Actualización

### Actualizar Rate Limits

```bash
# Ejemplo: Aumentar límite para GPTBot
curl -X POST "http://localhost:3000/api/admin/ai-crawler-security?action=rate-limits" \
  -H "Content-Type: application/json" \
  -d '{
    "crawlerType": "GPTBot",
    "limits": {
      "requestsPerMinute": 50,
      "requestsPerHour": 2000,
      "requestsPerDay": 20000,
      "burstLimit": 15
    }
  }'
```

### Agregar Nuevo Crawler

1. **Actualizar configuración en código**:
```typescript
// En lib/ai-crawler-security.ts
const DEFAULT_SECURITY_CONFIG = {
  crawlerRateLimits: {
    // ... existentes
    'NewBot': {
      requestsPerMinute: 30,
      requestsPerHour: 1000,
      requestsPerDay: 10000,
      burstLimit: 10
    }
  }
}
```

2. **Actualizar robots.txt**:
```typescript
// En app/robots.ts
const aiCrawlers = [
  'GPTBot',
  'Google-Extended',
  'ClaudeBot',
  'ChatGPT-User',
  'Bingbot',
  'NewBot'  // Agregar aquí
]
```

3. **Probar configuración**:
```bash
curl -H "User-Agent: NewBot/1.0" https://evolve2digital.com/es
```

### Modificar Rutas Permitidas

```typescript
// En app/robots.ts - Agregar nueva ruta
const allowedPaths = [
  '/',
  '/es/',
  '/en/',
  '/es/blog/',
  '/en/blog/',
  '/es/docs/',
  '/en/docs/',
  '/nueva-seccion/',  // Nueva ruta
  '/sitemap.xml',
  '/rss.xml'
]
```

---

## 📞 Contactos y Escalación

### Niveles de Soporte

1. **Nivel 1 - Operaciones Diarias**: Desarrollador/DevOps
2. **Nivel 2 - Incidentes Críticos**: Tech Lead
3. **Nivel 3 - Emergencias de Seguridad**: CTO/Security Team

### Procedimiento de Escalación

| Severidad | Tiempo de Respuesta | Criterios |
|-----------|-------------------|-----------|
| **P1 - Crítico** | 15 minutos | Sitio inaccesible para crawlers, brecha de seguridad |
| **P2 - Alto** | 2 horas | Rate limiting excesivo, health checks fallando |
| **P3 - Medio** | 24 horas | Optimizaciones, ajustes de configuración |
| **P4 - Bajo** | 72 horas | Mejoras, reportes, documentación |

---

**Última actualización**: Enero 2024  
**Versión**: 1.0.0  
**Próxima revisión**: Febrero 2024