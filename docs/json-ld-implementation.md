# JSON-LD Implementation Guide

## 📋 Resumen

Este documento describe la implementación completa del sistema de metadatos estructurados JSON-LD en el sitio web de Evolve2Digital, diseñado para optimizar la comprensión del contenido por parte de modelos de IA y motores de búsqueda.

## 🎯 Objetivos

- **Comprensión semántica**: Permitir que las IA interpreten relaciones entre artículos, autores, fechas y entidades sin ambigüedad
- **SEO avanzado**: Mejorar la visibilidad en motores de búsqueda mediante structured data
- **Automatización**: Sistema dinámico que genera metadatos a partir del contenido existente
- **Multiidioma**: Soporte completo para español e inglés
- **Mantenibilidad**: Código modular y extensible para futuras necesidades

## 🏗️ Arquitectura del Sistema

### Componentes Principales

1. **JsonLdGenerator** (`lib/json-ld-generator.ts`)
   - Generador central de schemas JSON-LD
   - Configuración dinámica por idioma
   - Soporte para múltiples tipos de schema

2. **Componentes de Schema** (`components/seo/`)
   - `OrganizationSchema`: Información de la empresa
   - `PersonSchema`: Datos del autor
   - `BlogPostSchema`: Metadatos de artículos

3. **Sistema de Validación** (`lib/json-ld-validator.ts`)
   - Validación automática de schemas
   - Cálculo de puntuación de calidad
   - Reportes detallados de errores

## 📊 Tipos de Schema Implementados

### Organization Schema
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Evolve2Digital",
  "url": "https://evolve2digital.com",
  "logo": "https://evolve2digital.com/logo.png",
  "description": "Consultoría especializada en transformación digital...",
  "founder": {
    "@type": "Person",
    "name": "Alberto Carrasco"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+34-XXX-XXX-XXX",
    "contactType": "customer service",
    "availableLanguage": ["Spanish", "English"]
  }
}
```

### Person Schema (Autor)
```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Alberto Carrasco",
  "jobTitle": "Digital Transformation Consultant",
  "worksFor": {
    "@type": "Organization",
    "name": "Evolve2Digital"
  },
  "url": "https://evolve2digital.com/about",
  "sameAs": [
    "https://linkedin.com/in/alberto-carrasco",
    "https://twitter.com/albertocarrasco"
  ]
}
```

### BlogPosting Schema
```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "Título del artículo",
  "description": "Descripción del contenido...",
  "author": {
    "@type": "Person",
    "name": "Alberto Carrasco"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Evolve2Digital"
  },
  "datePublished": "2024-01-15T10:00:00Z",
  "dateModified": "2024-01-15T10:00:00Z",
  "url": "https://evolve2digital.com/blog/articulo",
  "image": "https://evolve2digital.com/images/cover.jpg",
  "wordCount": 1500,
  "timeRequired": "PT8M",
  "keywords": ["transformación digital", "IA", "automatización"]
}
```

## 🔧 Configuración

### Configuración Base
```typescript
// lib/json-ld-generator.ts
export const defaultJsonLdConfig: JsonLdConfig = {
  organization: {
    name: "Evolve2Digital",
    url: "https://evolve2digital.com",
    logo: "https://evolve2digital.com/logo.png",
    // ... más configuración
  },
  person: {
    name: "Alberto Carrasco",
    jobTitle: {
      es: "Consultor en Transformación Digital",
      en: "Digital Transformation Consultant"
    },
    // ... más configuración
  }
};
```

### Configuración Multiidioma
El sistema detecta automáticamente el idioma actual y adapta:
- Descripciones y títulos
- URLs específicas por idioma
- Metadatos localizados

## 🚀 Uso en Componentes

### Layout Global (Organization)
```tsx
// app/[locale]/layout.tsx
import { OrganizationSchema } from '@/components/seo/json-ld';

export default function RootLayout({ children, params: { locale } }) {
  return (
    <html lang={locale}>
      <head>
        <OrganizationSchema locale={locale} />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### Posts de Blog
```tsx
// components/blog/blog-post.tsx
import { BlogPostSchema } from '@/components/seo/json-ld';

export function BlogPost({ post }) {
  return (
    <>
      <BlogPostSchema
        title={post.title}
        description={post.description}
        author={post.author}
        datePublished={post.date}
        url={post.url}
        image={post.cover}
        locale={post.locale}
        tags={post.tags}
        wordCount={post.wordCount}
        readingTime={post.readingTime}
      />
      {/* Contenido del post */}
    </>
  );
}
```

## ✅ Sistema de Validación

### Validación Automática
```bash
# Validar todos los schemas
npm run validate:json-ld

# Validar junto con sitemap y RSS
npm run validate:all
```

### Validación Manual
```typescript
import { JsonLdValidator } from '@/lib/json-ld-validator';

const result = JsonLdValidator.validateSchema(schemaData, 'BlogPosting');
console.log(`Puntuación: ${result.score}/100`);
console.log(`Errores: ${result.errors.length}`);
```

### Criterios de Validación

#### Propiedades Requeridas por Tipo
- **Organization**: name, url, @type, @context
- **Person**: name, @type, @context
- **BlogPosting**: headline, author, datePublished, @type, @context

#### Propiedades Recomendadas
- **Organization**: logo, description, contactPoint, address
- **Person**: jobTitle, worksFor, url, image
- **BlogPosting**: description, image, publisher, keywords, wordCount

## 🔍 Herramientas de Validación Externa

### Google Rich Results Test
1. Acceder a [Rich Results Test](https://search.google.com/test/rich-results)
2. Introducir URL del sitio o código HTML
3. Verificar que no hay errores críticos
4. Comprobar preview de resultados enriquecidos

### Schema.org Validator
1. Usar [Schema Markup Validator](https://validator.schema.org/)
2. Pegar el JSON-LD generado
3. Verificar compliance con Schema.org

### Structured Data Testing Tool
1. Acceder a [Structured Data Testing Tool](https://search.google.com/structured-data/testing-tool)
2. Analizar páginas específicas
3. Revisar warnings y errores

## 🛠️ Mantenimiento

### Agregar Nuevos Tipos de Schema

1. **Definir Interface**:
```typescript
// lib/json-ld-generator.ts
interface ServiceData {
  name: string;
  description: string;
  provider: OrganizationData;
  serviceType: string;
}
```

2. **Implementar Generador**:
```typescript
generateServiceSchema(data: ServiceData, locale: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: data.name,
    description: data.description,
    provider: this.generateOrganizationSchema(locale),
    serviceType: data.serviceType
  };
}
```

3. **Crear Componente**:
```tsx
// components/seo/service-schema.tsx
export function ServiceSchema({ service, locale }) {
  const generator = new JsonLdGenerator(defaultJsonLdConfig);
  const schema = generator.generateServiceSchema(service, locale);
  
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
```

4. **Actualizar Validador**:
```typescript
// lib/json-ld-validator.ts
private static readonly REQUIRED_PROPERTIES = {
  // ... otros tipos
  Service: ['name', 'description', 'provider', '@type', '@context']
};
```

### Actualizar Configuración

Para modificar datos de la organización o autor:

1. Editar `defaultJsonLdConfig` en `lib/json-ld-generator.ts`
2. Ejecutar validación: `npm run validate:json-ld`
3. Verificar con herramientas externas

### Debugging

#### Verificar JSON-LD en Navegador
```javascript
// En DevTools Console
const scripts = document.querySelectorAll('script[type="application/ld+json"]');
scripts.forEach((script, index) => {
  console.log(`Schema ${index}:`, JSON.parse(script.textContent));
});
```

#### Logs de Validación
```bash
# Ejecutar con logs detallados
DEBUG=json-ld npm run validate:json-ld
```

## 📈 Métricas y Monitoreo

### KPIs a Monitorear
- **Cobertura**: % de páginas con JSON-LD válido
- **Calidad**: Puntuación promedio de schemas
- **Errores**: Número de validaciones fallidas
- **Rich Results**: Aparición en resultados enriquecidos

### Reportes Automáticos
El sistema genera reportes en `validation-reports/` con:
- Resumen de validación por tipo de schema
- Lista de errores y warnings
- Recomendaciones de mejora
- Tendencias temporales

## 🔮 Roadmap Futuro

### Próximas Funcionalidades
- [ ] Schema para `FAQPage`
- [ ] Schema para `HowTo` (tutoriales)
- [ ] Schema para `Course` (cursos online)
- [ ] Integración con Google Analytics 4
- [ ] Monitoreo automático de Rich Results

### Optimizaciones Planificadas
- [ ] Cache de schemas generados
- [ ] Compresión de JSON-LD
- [ ] Lazy loading de schemas no críticos
- [ ] A/B testing de diferentes estructuras

## 📞 Soporte

Para dudas o problemas con la implementación JSON-LD:

1. **Revisar logs**: `npm run validate:json-ld`
2. **Consultar documentación**: Este archivo y comentarios en código
3. **Verificar herramientas externas**: Rich Results Test, Schema Validator
4. **Contactar**: alberto@evolve2digital.com

---

**Última actualización**: Enero 2025  
**Versión**: 1.0.0  
**Mantenedor**: Alberto Carrasco