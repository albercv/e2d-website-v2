# Lista de Verificación - Metadatos Estructurados JSON-LD

## 🎯 Objetivo
Esta lista de verificación garantiza que la implementación de JSON-LD cumple con los estándares de Schema.org y es correctamente interpretada por motores de búsqueda y modelos de IA.

## ✅ Checklist de Validación

### 1. Validación Técnica Automática

#### Scripts de Validación Local
- [ ] `npm run validate:json-ld` ejecuta sin errores
- [ ] `npm run validate:all` completa exitosamente
- [ ] Puntuación de calidad ≥ 85/100 para todos los schemas
- [ ] Cero errores críticos en el reporte de validación

#### Verificación de Archivos
- [ ] Archivo de reporte generado en `validation-reports/`
- [ ] Logs de validación sin warnings críticos
- [ ] Todas las páginas principales incluidas en el análisis

### 2. Validación con Herramientas Externas

#### Google Rich Results Test
**URL**: https://search.google.com/test/rich-results

**Páginas a Validar**:
- [ ] Página principal (ES): `https://evolve2digital.com/es`
- [ ] Página principal (EN): `https://evolve2digital.com/en`
- [ ] Post de blog (ES): `https://evolve2digital.com/es/blog/[slug]`
- [ ] Post de blog (EN): `https://evolve2digital.com/en/blog/[slug]`
- [ ] Página sobre nosotros: `https://evolve2digital.com/es/about`

**Criterios de Aprobación**:
- [ ] Sin errores críticos (rojo)
- [ ] Máximo 2 warnings (amarillo) por página
- [ ] Preview de rich results visible
- [ ] Datos estructurados detectados correctamente

#### Schema.org Markup Validator
**URL**: https://validator.schema.org/

**Schemas a Validar**:
- [ ] Organization schema (extraído de página principal)
- [ ] Person schema (extraído de página de autor)
- [ ] BlogPosting schema (extraído de posts)

**Criterios de Aprobación**:
- [ ] Validación exitosa sin errores
- [ ] Todas las propiedades requeridas presentes
- [ ] Formato JSON-LD correcto

#### Google Search Console
**Sección**: Mejoras > Datos estructurados

**Verificaciones**:
- [ ] Artículos detectados correctamente
- [ ] Organización indexada
- [ ] Sin errores de datos estructurados
- [ ] Tendencia positiva en elementos válidos

### 3. Validación de Contenido

#### Organization Schema
- [ ] Nombre: "Evolve2Digital"
- [ ] URL principal correcta
- [ ] Logo accesible y válido
- [ ] Descripción en idioma correcto
- [ ] Información de contacto presente
- [ ] Perfiles sociales incluidos
- [ ] Dirección (si aplicable)

#### Person Schema (Alberto Carrasco)
- [ ] Nombre completo correcto
- [ ] Título profesional en idioma apropiado
- [ ] Relación con organización establecida
- [ ] URL de perfil válida
- [ ] Enlaces sociales funcionales

#### BlogPosting Schema
- [ ] Título (headline) coincide con H1
- [ ] Descripción relevante y única
- [ ] Autor correctamente referenciado
- [ ] Fechas de publicación y modificación válidas
- [ ] URL canónica correcta
- [ ] Imagen destacada accesible
- [ ] Palabras clave relevantes
- [ ] Tiempo de lectura calculado
- [ ] Conteo de palabras preciso

### 4. Validación Multiidioma

#### Español (ES)
- [ ] Descripciones en español correcto
- [ ] URLs con prefijo `/es/`
- [ ] Metadatos localizados
- [ ] Fechas en formato local
- [ ] Palabras clave en español

#### Inglés (EN)
- [ ] Descripciones en inglés correcto
- [ ] URLs con prefijo `/en/`
- [ ] Metadatos localizados
- [ ] Fechas en formato internacional
- [ ] Palabras clave en inglés

### 5. Validación de Rendimiento

#### Tamaño de Schemas
- [ ] JSON-LD total < 50KB por página
- [ ] Schemas minificados correctamente
- [ ] Sin duplicación de datos
- [ ] Carga no bloquea renderizado

#### Integración SSG
- [ ] Schemas generados en build time
- [ ] Sin errores de hidratación
- [ ] Compatible con Next.js static export
- [ ] Funciona sin JavaScript habilitado

### 6. Validación de Accesibilidad

#### Estructura HTML
- [ ] Scripts JSON-LD en `<head>` o antes de `</body>`
- [ ] Tipo MIME correcto: `application/ld+json`
- [ ] JSON válido (sin errores de sintaxis)
- [ ] Caracteres especiales escapados correctamente

#### SEO Técnico
- [ ] No interfiere con meta tags existentes
- [ ] Compatible con Open Graph
- [ ] Compatible con Twitter Cards
- [ ] No duplica información de meta tags

## 🔧 Herramientas de Validación

### Herramientas Online
1. **Google Rich Results Test**: https://search.google.com/test/rich-results
2. **Schema Markup Validator**: https://validator.schema.org/
3. **Structured Data Testing Tool**: https://search.google.com/structured-data/testing-tool
4. **JSON-LD Playground**: https://json-ld.org/playground/

### Herramientas de Desarrollo
```bash
# Validación local completa
npm run validate:all

# Solo JSON-LD
npm run validate:json-ld

# Con reporte detallado
npm run validate:json-ld -- --verbose --report
```

### Extensiones de Navegador
- **Structured Data Viewer** (Chrome)
- **Schema.org Validator** (Firefox)
- **Rich Results Test** (Bookmarklet)

## 📊 Criterios de Calidad

### Puntuación Mínima
- **Excelente**: 95-100 puntos
- **Bueno**: 85-94 puntos
- **Aceptable**: 70-84 puntos
- **Necesita mejora**: < 70 puntos

### Distribución de Puntos
- **Propiedades requeridas**: 40 puntos
- **Propiedades recomendadas**: 30 puntos
- **Formato y sintaxis**: 20 puntos
- **Optimización semántica**: 10 puntos

## 🚨 Errores Críticos a Evitar

### Errores de Formato
- [ ] JSON malformado
- [ ] Tipos de datos incorrectos
- [ ] URLs inválidas o rotas
- [ ] Fechas en formato incorrecto

### Errores de Contenido
- [ ] Información inconsistente entre schemas
- [ ] Datos desactualizados
- [ ] Referencias circulares
- [ ] Propiedades requeridas faltantes

### Errores de Implementación
- [ ] Múltiples schemas del mismo tipo
- [ ] Schemas duplicados
- [ ] Carga en momento incorrecto
- [ ] Conflictos con otros metadatos

## 📈 Monitoreo Continuo

### Frecuencia de Validación
- **Diaria**: Validación automática local
- **Semanal**: Verificación con herramientas externas
- **Mensual**: Revisión completa de calidad
- **Trimestral**: Auditoría de rendimiento SEO

### Alertas Automáticas
- [ ] Configurar alertas por errores críticos
- [ ] Monitorear cambios en puntuación
- [ ] Notificar sobre nuevos warnings
- [ ] Reportar problemas de indexación

## 📋 Registro de Validaciones

### Plantilla de Reporte
```
Fecha: ___________
Validador: ___________
Herramienta: ___________
URL Validada: ___________

Resultados:
- Errores: ___/___
- Warnings: ___/___
- Puntuación: ___/100

Acciones Requeridas:
- [ ] ___________
- [ ] ___________
- [ ] ___________

Próxima Validación: ___________
```

### Historial de Cambios
Mantener registro de:
- Modificaciones en schemas
- Actualizaciones de configuración
- Cambios en validadores
- Mejoras implementadas

---

**Responsable**: Alberto Carrasco  
**Última Actualización**: Enero 2025  
**Próxima Revisión**: Febrero 2025