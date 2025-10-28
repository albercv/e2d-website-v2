# 🧪 Guía de Pruebas - Sistema de Regeneración Automática

Esta guía te permitirá verificar que todo el sistema de regeneración automática funciona correctamente.

## 📋 Preparación Inicial

### 1. Verificar Estado Actual
```bash
# Verificar que los servicios estén ejecutándose
npm run dev          # Terminal 1 (ya ejecutándose)
npm run seo:watch    # Terminal 2 (ya ejecutándose)

# Verificar archivos base existentes
ls -la public/sitemap.xml
ls -la public/rss-*.xml
ls -la docs/mcp-*.md
```

### 2. Tomar Snapshot Inicial
```bash
# Contar URLs en sitemap actual
grep -c "<url>" public/sitemap.xml

# Contar items en RSS
grep -c "<item>" public/rss-es.xml
grep -c "<item>" public/rss-en.xml

# Ver última modificación de archivos MCP
ls -la docs/mcp-*.md
```

## 🔍 Batería de Pruebas

### Prueba 1: Crear Nuevo Post en Español
```bash
# Crear archivo de prueba
cat > content/posts/prueba-sistema-automatico.mdx << 'EOF'
---
title: "Prueba del Sistema Automático"
description: "Post de prueba para verificar la regeneración automática de SEO"
publishedAt: "2024-01-15"
slug: "prueba-sistema-automatico"
tags: ["testing", "automation", "seo"]
author: "Sistema de Pruebas"
featured: false
language: "es"
---

# Prueba del Sistema Automático

Este es un post de prueba para verificar que el sistema de regeneración automática funciona correctamente.

## Características a Probar

- Regeneración automática de sitemap
- Actualización de RSS feeds
- Detección de cambios por file watcher
- Inclusión en índices de búsqueda

## Contenido de Prueba

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
EOF
```

**Verificaciones Esperadas:**
- [ ] File watcher detecta el cambio (ver logs en terminal)
- [ ] Sitemap se regenera automáticamente
- [ ] RSS español se actualiza con el nuevo post
- [ ] Nuevo post aparece en el sitemap con URL correcta

### Prueba 2: Crear Nuevo Post en Inglés
```bash
# Crear archivo de prueba en inglés
cat > content/posts/automatic-system-test.mdx << 'EOF'
---
title: "Automatic System Test"
description: "Test post to verify automatic SEO regeneration"
publishedAt: "2024-01-15"
slug: "automatic-system-test"
tags: ["testing", "automation", "seo"]
author: "Test System"
featured: true
language: "en"
---

# Automatic System Test

This is a test post to verify that the automatic regeneration system works correctly.

## Features to Test

- Automatic sitemap regeneration
- RSS feeds update
- File watcher change detection
- Search index inclusion

## Test Content

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
EOF
```

**Verificaciones Esperadas:**
- [ ] File watcher detecta el cambio
- [ ] RSS inglés se actualiza con el nuevo post
- [ ] Post marcado como `featured: true` aparece correctamente
- [ ] Sitemap incluye ambos posts nuevos

### Prueba 3: Modificar Post Existente
```bash
# Modificar un post existente
# Agregar una línea al final de cualquier post existente
echo -e "\n## Actualización de Prueba\n\nEsta línea fue agregada para probar la regeneración automática." >> content/posts/prueba-sistema-automatico.mdx
```

**Verificaciones Esperadas:**
- [ ] File watcher detecta la modificación
- [ ] Sitemap se actualiza con nueva fecha de modificación
- [ ] RSS mantiene el post pero con contenido actualizado

### Prueba 4: Probar Endpoints MCP
```bash
# Probar endpoint de manifest
curl -X GET "http://localhost:3000/api/mcp/manifest" \
  -H "Content-Type: application/json" | jq .

# Probar endpoint de búsqueda de posts
curl -X POST "http://localhost:3000/api/mcp/tools/posts/search" \
  -H "Content-Type: application/json" \
  -d '{"query": "prueba"}' | jq .

# Probar endpoint del agente
curl -X POST "http://localhost:3000/api/mcp/tools/agent/query" \
  -H "Content-Type: application/json" \
  -d '{"query": "¿Qué posts hay sobre testing?"}' | jq .

# Probar endpoint del chat web (requiere configuración externa)
# NOTA: El chat web está integrado con n8n y requiere credenciales válidas del webhook externo
curl -X POST "http://localhost:3000/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "chatInput": "¿Qué servicios ofrece Evolve2Digital?",
    "sessionId": "test-uuid-12345",
    "metadata": {"locale": "es"}
  }' | jq .
```

**Verificaciones Esperadas:**
- [ ] Manifest devuelve lista de herramientas disponibles
- [ ] Búsqueda encuentra los posts de prueba creados
- [ ] Agente responde con información relevante
- [ ] Documentación MCP se regenera automáticamente

### Prueba 5: Verificar Regeneración de Documentación MCP
```bash
# Modificar un endpoint MCP para probar regeneración
# Agregar un comentario JSDoc a un endpoint existente
```

**Verificaciones Esperadas:**
- [ ] File watcher detecta cambios en app/api/mcp/
- [ ] Documentación MCP se regenera
- [ ] Archivos mcp-usage.md, mcp-examples.md, mcp-changelog.md se actualizan

### Prueba 6: Verificar Integridad de Archivos Generados

#### Sitemap
```bash
# Verificar estructura del sitemap
xmllint --format public/sitemap.xml | head -20

# Contar URLs totales
grep -c "<url>" public/sitemap.xml

# Verificar que incluye los nuevos posts
grep "prueba-sistema-automatico" public/sitemap.xml
grep "automatic-system-test" public/sitemap.xml
```

#### RSS Feeds
```bash
# Verificar RSS español
xmllint --format public/rss-es.xml | head -30
grep -A 5 -B 5 "Prueba del Sistema" public/rss-es.xml

# Verificar RSS inglés
xmllint --format public/rss-en.xml | head -30
grep -A 5 -B 5 "Automatic System Test" public/rss-en.xml
```

#### Documentación MCP
```bash
# Verificar archivos MCP
ls -la docs/mcp-*.md
head -10 docs/mcp-usage.md
grep -c "endpoint" docs/mcp-usage.md
```

### Prueba 7: Probar Sistema de Skip Build
```bash
# Simular cambio solo de contenido
git add content/posts/prueba-sistema-automatico.mdx
git commit -m "Add test post for automatic regeneration"

# Probar script de skip build
npm run production:test-skip-build
```

**Verificaciones Esperadas:**
- [ ] Script detecta solo cambios de contenido
- [ ] Ejecuta regeneración SEO
- [ ] Retorna exit code 0 (skip build)

### Prueba 8: Probar Endpoints de Cron (Simulación)
```bash
# Simular llamada a endpoint de regeneración SEO
curl -X GET "http://localhost:3000/api/cron/regenerate-seo" \
  -H "Authorization: Bearer test-secret" | jq .

# Simular llamada a endpoint de regeneración MCP
curl -X GET "http://localhost:3000/api/cron/regenerate-mcp" \
  -H "Authorization: Bearer test-secret" | jq .

# Simular llamada a endpoint de verificación de integridad
curl -X GET "http://localhost:3000/api/cron/integrity-check" \
  -H "Authorization: Bearer test-secret" | jq .
```

**Nota:** Estos endpoints requieren autenticación. En desarrollo, puedes modificar temporalmente la verificación.

## 📊 Métricas de Verificación

### Antes de las Pruebas
```bash
echo "=== ESTADO INICIAL ==="
echo "Sitemap URLs: $(grep -c "<url>" public/sitemap.xml)"
echo "RSS ES items: $(grep -c "<item>" public/rss-es.xml)"
echo "RSS EN items: $(grep -c "<item>" public/rss-en.xml)"
echo "MCP endpoints: $(grep -c "## " docs/mcp-usage.md)"
```

### Después de las Pruebas
```bash
echo "=== ESTADO FINAL ==="
echo "Sitemap URLs: $(grep -c "<url>" public/sitemap.xml)"
echo "RSS ES items: $(grep -c "<item>" public/rss-es.xml)"
echo "RSS EN items: $(grep -c "<item>" public/rss-en.xml)"
echo "MCP endpoints: $(grep -c "## " docs/mcp-usage.md)"
```

## 🧹 Limpieza Post-Pruebas
```bash
# Eliminar archivos de prueba
rm content/posts/prueba-sistema-automatico.mdx
rm content/posts/automatic-system-test.mdx

# Esperar a que el file watcher detecte los cambios y regenere
# Verificar que los archivos se eliminaron del sitemap y RSS
```

## ✅ Checklist de Verificación

### File Watcher
- [ ] Detecta creación de archivos
- [ ] Detecta modificación de archivos
- [ ] Detecta eliminación de archivos
- [ ] Debounce funciona correctamente (no regenera múltiples veces)
- [ ] Logs son claros y informativos

### Regeneración SEO
- [ ] Sitemap se actualiza automáticamente
- [ ] RSS feeds se actualizan por idioma
- [ ] URLs son correctas y accesibles
- [ ] Fechas de modificación son precisas
- [ ] Metadatos se extraen correctamente

### Documentación MCP
- [ ] Se regenera cuando cambian endpoints
- [ ] Incluye todos los endpoints disponibles
- [ ] Ejemplos son precisos y actualizados
- [ ] Changelog refleja cambios recientes

### Endpoints MCP
- [ ] Manifest devuelve herramientas correctas
- [ ] Búsqueda de posts funciona
- [ ] Agente responde apropiadamente
- [ ] Autenticación funciona donde corresponde

### Sistema de Producción
- [ ] Skip build detecta cambios correctamente
- [ ] Endpoints de cron están configurados
- [ ] Vercel.json tiene configuración correcta
- [ ] Variables de entorno están documentadas

## 🚨 Troubleshooting

### File Watcher No Detecta Cambios
```bash
# Verificar que el proceso esté ejecutándose
ps aux | grep "auto-regenerate-seo"

# Revisar logs del file watcher
# (Los logs aparecen en el terminal donde se ejecuta npm run seo:watch)
```

### Sitemap No Se Actualiza
```bash
# Verificar permisos de escritura
ls -la public/sitemap.xml

# Ejecutar regeneración manual
npm run seo:regenerate
```

### Endpoints MCP No Responden
```bash
# Verificar que el servidor de desarrollo esté ejecutándose
curl -I http://localhost:3000/api/mcp/manifest

# Revisar logs del servidor
# (Los logs aparecen en el terminal donde se ejecuta npm run dev)
```

## 📈 Métricas de Performance

Durante las pruebas, monitorea:
- Tiempo de regeneración de sitemap
- Tiempo de regeneración de RSS
- Tiempo de respuesta de endpoints MCP
- Uso de memoria del file watcher
- Frecuencia de regeneraciones

¡Con esta batería de pruebas podrás verificar completamente que el sistema de regeneración automática funciona como esperado!