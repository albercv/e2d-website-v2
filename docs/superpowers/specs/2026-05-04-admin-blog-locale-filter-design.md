# Filtro por idioma en el dashboard del blog (admin)

**Fecha**: 2026-05-04
**Estado**: aprobado
**Alcance**: `components/admin/admin-dashboard-tabs.tsx`

## Problema

El dashboard de admin (`/admin`, pestaña "CMS Blog") lista todos los posts MDX
ordenados por fecha sin diferenciar idioma. Con tres locales (`es`, `en`, `it`)
y crecimiento previsto del blog, encontrar variantes de un mismo artículo o
trabajar sobre un solo idioma es tedioso. Se necesita un filtro que permita
ver uno, varios o todos los idiomas a la vez.

## Solución

Toolbar con pills toggleables encima de la tabla de posts. Filtrado
client-side sobre el array de posts ya cargado por el server component.

## UI

```
┌────────────────────────────────────────────────────┐
│ CMS Blog                          [ Nuevo post ]   │
│                                                    │
│ Idioma: [Todos] [ES] [EN] [IT]         12 posts    │
│ ─────────────────────────────────────────────      │
│ [tabla de posts]                                   │
└────────────────────────────────────────────────────┘
```

- Pills construidos con el componente `Button` de shadcn.
- Pill activo: `variant="default"`. Pill inactivo: `variant="outline"`.
- Contador a la derecha refleja el número de posts visibles tras el filtro.

## Comportamiento

| Acción del usuario              | Resultado                                       |
|---------------------------------|-------------------------------------------------|
| Estado inicial                  | "Todos" activo, se ven los 3 idiomas            |
| Click en `ES`                   | Mono-selección: solo `es`                       |
| Ctrl/Cmd-click en `EN`          | Multi-selección: `es` + `en`                    |
| Click en `Todos`                | Reset a estado inicial                          |
| Desmarcar el último idioma      | Vuelve automáticamente a "Todos" (no vacío)     |

## Implementación

- **Sin cambios en `app/admin/page.tsx`**: sigue pasando todos los posts.
- **`admin-dashboard-tabs.tsx`** (client component existente):
  - `useState<Set<string>>` con los locales activos. Set vacío = "Todos".
  - Lista derivada de posts visibles via `useMemo`.
  - Handler de click que distingue ctrl/metaKey para multi-selección.
  - Subcomponente local `LocaleFilter` con los pills (no componente reutilizable, vive en el mismo fichero).
- Sin persistencia en URL ni cookies — el filtro es estado de sesión local.

## Tests

`__tests__/components/admin-dashboard-tabs.test.tsx` (Jest + Testing Library):

1. Render inicial muestra todos los posts y el pill "Todos" activo.
2. Click en `ES` deja solo posts con `locale === 'es'`.
3. Ctrl-click en `EN` después de seleccionar `ES` muestra posts `es` + `en`.
4. Click en "Todos" tras tener un filtro restablece la lista completa.
5. Contador refleja correctamente el número de filas visibles.

Mock data: tres posts mínimos, uno por locale.

## Fuera de alcance

- No se filtra desde la API ni el server component.
- No hay sincronización con URL/query params.
- No hay filtros adicionales (por estado publicado, por slug, etc.) en esta
  iteración. Si se añaden en el futuro, el toolbar puede extenderse.
- No se modifica la columna `Locale` de la tabla.

## Riesgos

- **Bundle size**: los pills añaden ~40 líneas al client component. Despreciable.
- **Accesibilidad del ctrl-click**: descubrible solo por convención. Mitigación:
  añadir `title` en los pills explicando el ctrl-click. Opcional en esta
  iteración; si la UX lo requiere se promueve a checkboxes (Opción B del
  brainstorming).
