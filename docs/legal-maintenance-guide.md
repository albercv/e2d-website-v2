# Guía de Mantenimiento Legal - E2D Website

## 📋 Resumen

Esta guía proporciona instrucciones detalladas para mantener actualizadas las páginas legales del sitio web de Evolve2Digital, asegurando el cumplimiento continuo con GDPR, LOPDGDD y mejores prácticas de transparencia digital.

## 🎯 Páginas Legales Implementadas

### 1. Aviso Legal (`/legal`)
- **Archivo**: `app/[locale]/legal/legal-client.tsx`
- **Contenido**: Información general de la empresa, condiciones de uso, propiedad intelectual
- **Última actualización**: Enero 2025

### 2. Política de Privacidad (`/privacy`)
- **Archivo**: `app/[locale]/privacy/privacy-client.tsx`
- **Contenido**: Tratamiento de datos personales, derechos GDPR, base legal
- **Última actualización**: Enero 2025

### 3. Política de Cookies (`/cookies`)
- **Archivo**: `app/[locale]/cookies/cookies-client.tsx`
- **Contenido**: Tipos de cookies, gestión, consentimiento
- **Última actualización**: Enero 2025

## 🔧 Procedimientos de Actualización

### Actualizar Fechas de Modificación

#### 1. En las Páginas Legales
Actualizar la fecha en cada componente cliente:

```tsx
// En legal-client.tsx, privacy-client.tsx, cookies-client.tsx
<p className="text-muted-foreground text-lg">
  Última actualización: [NUEVA_FECHA]
</p>
```

#### 2. En JSON-LD Metadata
Actualizar automáticamente en `lib/json-ld-generator.ts`:

```typescript
// La fecha se actualiza automáticamente con:
dateModified: new Date().toISOString().split('T')[0]
```

### Actualizar Información de Contacto

#### 1. Datos de la Empresa
Modificar en `lib/json-ld-generator.ts`:

```typescript
export const defaultJsonLdConfig: JsonLdConfig = {
  organization: {
    name: "E2D - Evolve2Digital",
    email: "hello@evolve2digital.com",
    telephone: "+34-600-000-000", // Actualizar si cambia
    address: {
      country: "ES",
      locality: "España" // Actualizar si cambia
    }
  }
}
```

#### 2. En las Páginas Legales
Buscar y reemplazar en todos los archivos:
- Email: `hello@evolve2digital.com`
- Responsable: `Alberto Carrasco Hernández`
- Empresa: `E2D - Evolve2Digital`

#### 3. En el Footer
Actualizar en `components/footer.tsx`:

```tsx
<div className="space-y-2">
  <p className="font-semibold">E2D - Evolve2Digital</p>
  <p className="text-sm text-muted-foreground">hello@evolve2digital.com</p>
  <p className="text-sm text-muted-foreground">España</p>
</div>
```

### Actualizar Contenido Legal

#### 1. Modificar Textos
Para cambios en el contenido legal, editar directamente los archivos:
- `app/[locale]/legal/legal-client.tsx`
- `app/[locale]/privacy/privacy-client.tsx`
- `app/[locale]/cookies/cookies-client.tsx`

#### 2. Añadir Nuevas Secciones
Seguir la estructura existente:

```tsx
<section className="mb-8">
  <h2 className="text-2xl font-semibold mb-4">Nuevo Título</h2>
  <p className="text-muted-foreground leading-relaxed">
    Contenido de la nueva sección...
  </p>
</section>

<Separator className="my-8" />
```

### Gestión del Banner de Cookies

#### 1. Configurar Tipos de Cookies
Modificar en `components/gdpr/cookie-banner.tsx`:

```typescript
interface CookiePreferences {
  necessary: boolean
  analytics: boolean
  marketing: boolean
  // Añadir nuevos tipos si es necesario
}
```

#### 2. Actualizar Traducciones
Modificar en `messages/es.json` y `messages/en.json`:

```json
{
  "cookies": {
    "title": "Uso de Cookies",
    "description": "Utilizamos cookies para mejorar su experiencia...",
    "acceptAll": "Aceptar todas",
    "rejectAll": "Rechazar todas",
    "customize": "Personalizar"
  }
}
```

## 📅 Calendario de Revisiones

### Revisiones Obligatorias

#### Mensual
- [ ] Verificar que las fechas de "última actualización" son correctas
- [ ] Comprobar que los enlaces legales en el footer funcionan
- [ ] Validar que el banner de cookies aparece correctamente

#### Trimestral
- [ ] Revisar cambios en normativas GDPR/LOPDGDD
- [ ] Actualizar contenido legal si es necesario
- [ ] Verificar datos de contacto y empresa

#### Anual
- [ ] Revisión completa de todas las políticas
- [ ] Actualización de fechas en metadatos
- [ ] Auditoría de cumplimiento legal

### Triggers de Actualización Inmediata

#### Cambios en la Empresa
- Cambio de razón social
- Nueva dirección o teléfono
- Modificación del email de contacto
- Cambios en servicios ofrecidos

#### Cambios Normativos
- Nuevas regulaciones GDPR
- Actualizaciones LOPDGDD
- Cambios en normativas de cookies

#### Cambios Técnicos
- Implementación de nuevas cookies
- Cambios en herramientas de análisis
- Modificaciones en el tratamiento de datos

## 🛠️ Herramientas de Validación

### Validación Automática
```bash
# Ejecutar validación de JSON-LD
npm run validate:json-ld

# Verificar enlaces rotos
npm run check:links

# Validar accesibilidad
npm run test:a11y
```

### Validación Externa

#### Google Rich Results Test
1. Acceder a [Rich Results Test](https://search.google.com/test/rich-results)
2. Introducir URLs de páginas legales
3. Verificar que no hay errores en metadatos

#### Schema.org Validator
1. Usar [Schema Markup Validator](https://validator.schema.org/)
2. Validar JSON-LD generado
3. Corregir errores reportados

### Checklist de Validación Manual

#### Funcionalidad
- [ ] Banner de cookies aparece en primera visita
- [ ] Preferencias de cookies se guardan correctamente
- [ ] Enlaces legales en footer funcionan
- [ ] Páginas legales cargan sin errores
- [ ] Metadatos JSON-LD son válidos

#### Contenido
- [ ] Fechas de actualización son correctas
- [ ] Información de contacto está actualizada
- [ ] Textos legales son precisos y completos
- [ ] Traducciones están sincronizadas

#### Accesibilidad
- [ ] Contraste de colores es adecuado
- [ ] Navegación por teclado funciona
- [ ] Lectores de pantalla pueden acceder al contenido
- [ ] Estructura de encabezados es lógica

## 🚨 Procedimiento de Emergencia

### En caso de requerimiento legal urgente:

1. **Identificar el cambio requerido**
   - Determinar qué página(s) necesitan actualización
   - Identificar el contenido específico a modificar

2. **Realizar cambios inmediatos**
   ```bash
   # Crear rama de emergencia
   git checkout -b hotfix/legal-update
   
   # Realizar cambios necesarios
   # Actualizar fechas de modificación
   
   # Commit y push
   git add .
   git commit -m "hotfix: urgent legal content update"
   git push origin hotfix/legal-update
   ```

3. **Validar cambios**
   - Ejecutar validaciones automáticas
   - Verificar en entorno de desarrollo
   - Comprobar metadatos JSON-LD

4. **Desplegar a producción**
   ```bash
   # Merge a main
   git checkout main
   git merge hotfix/legal-update
   git push origin main
   
   # Desplegar
   npm run deploy
   ```

5. **Verificar en producción**
   - Comprobar que los cambios son visibles
   - Validar con herramientas externas
   - Documentar el cambio realizado

## 📞 Contactos de Emergencia

### Responsables Técnicos
- **Desarrollador Principal**: Alberto Carrasco
- **Email**: hello@evolve2digital.com

### Recursos Legales
- **Asesor Legal**: [Contacto del asesor legal]
- **Consultor GDPR**: [Contacto del consultor]

## 📚 Recursos Adicionales

### Documentación Técnica
- [JSON-LD Implementation Guide](./json-ld-implementation.md)
- [External Testing Guide](./external-testing-guide.md)
- [Validation Checklist](./validation-checklist.md)

### Recursos Legales
- [GDPR Official Text](https://gdpr-info.eu/)
- [LOPDGDD Spain](https://www.boe.es/eli/es/lo/2018/12/05/3)
- [Cookie Law Guidelines](https://ec.europa.eu/info/cookies_en)

### Herramientas Útiles
- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Schema.org Validator](https://validator.schema.org/)
- [WAVE Web Accessibility Evaluator](https://wave.webaim.org/)

---

**Última actualización**: Enero 2025  
**Versión**: 1.0.0  
**Mantenedor**: Alberto Carrasco  
**Próxima revisión**: Abril 2025