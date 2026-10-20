# Encargo literal — correcciones de la auditoría pública del 20 de octubre de 2026

> Copia literal del encargo recibido el 2026-10-20. Es la especificación del plan
> `docs/superpowers/plans/2026-10-20-audit-fixes.md`. No editar: las decisiones
> tomadas al implementarlo viven en el plan y en `entrega.md`.

Implementa las siguientes correcciones en evolve2digital.com y e2dprojects.com. Proceden de una auditoría pública realizada el 20 de octubre de 2026.
Trabaja sobre los repositorios reales. Lee sus instrucciones, identifica el framework y las versiones utilizadas y verifica cada hallazgo antes de modificarlo. Si algo ya está corregido, compruébalo y márcalo como resuelto.
Mantén el diseño y las funcionalidades existentes. Centraliza los datos compartidos cuando corresponda. Si solo tienes acceso a uno de los proyectos, completa sus tareas y documenta las pendientes del otro.

## Tarea 1. Permitir recursos públicos en robots.txt
Prioridad: alta. Dominio: evolve2digital.com.
Actualmente se utiliza:

```
Disallow: /_next/
```

Esta regla afecta a recursos CSS y JavaScript utilizados por la web.
En cada grupo que contenga ese bloqueo, incorpora las excepciones:

```
Disallow: /_next/
Allow: /_next/static/
Allow: /_next/image
```

Revisa tanto el grupo general como los específicos. No fijes nombres de archivos con hash.
Conserva las restricciones sobre rutas privadas y las preferencias actuales de entrenamiento. La ausencia de un grupo explícito de OAI-SearchBot no implica que esté bloqueado.
Aceptación: la política efectiva permite los recursos públicos necesarios. Compruébalo con un evaluador que interprete correctamente grupos y precedencia por especificidad; encontrar un `Allow` en el texto no basta.

## Tarea 2. Corregir los perfiles de identidad publicados
Prioridad: alta. Dominio: evolve2digital.com.
El JSON-LD contiene estos perfiles en `Organization.sameAs` y `Organization.founder.sameAs`:

```
https://github.com/albertocarrasco
https://linkedin.com/in/albertocarrasco
https://twitter.com/albertocarrasco
```

Verifica su titularidad. Los perfiles candidatos identificados durante la auditoría son:

```
https://github.com/albercv
https://es.linkedin.com/in/albercv
```

La cuenta GitHub conectada durante la auditoría utilizaba `albercv`. La titularidad de los demás destinos debe acreditarse mediante información suficiente.

* Conserva únicamente referencias verificadas.
* Coloca los perfiles personales en `Person`.
* Utiliza en `Organization.sameAs` únicamente perfiles equivalentes de la marca.
* No inventes un perfil de X.
* No sustituyas perfiles basándote exclusivamente en coincidencias de nombre.

Si un enlace no puede acreditarse, retíralo del marcado y documenta la referencia pendiente.
Aceptación: todas las páginas e idiomas publican perfiles coherentes con la entidad descrita.

## Tarea 3. Unificar los identificadores de las entidades
Prioridad: media. Ambos dominios.
Utiliza estos identificadores compartidos:

```
Organización: https://evolve2digital.com#organization
Persona: https://evolve2digital.com#person
```

El portfolio utiliza actualmente:

```
https://evolve2digital.com/#org
```

Actualiza las referencias correspondientes en `Organization`, `founder`, `publisher`, `creator`, `author` y `worksFor`, según qué entidad represente cada propiedad.
No conviertas automáticamente todos los autores o creadores en la organización: Alberto y Evolve2Digital son entidades relacionadas, pero distintas.
Modifica los generadores existentes para evitar bloques duplicados o contradictorios.
Aceptación: los mismos IDs representan a las mismas entidades en ambos sitios y en sus variantes de idioma.

## Tarea 4. Conectar explícitamente el portfolio y la web corporativa
Prioridad: media. Ambos dominios.
En el portfolio, identifica al profesional por su nombre:
Soy Alberto Carrasco, desarrollador de software y fundador de Evolve2Digital. e2dProjects es mi portfolio de proyectos.
Añade un enlace HTML normal desde "Evolve2Digital" a:

```
https://evolve2digital.com/es
```

En la corporativa, añade desde el bloque de proyectos un enlace al portfolio:

```
https://e2dprojects.com/es/
```

Cuando las fichas de proyectos dispongan de casos o dominios públicos, utiliza enlaces navegables. Puedes conservar los modales como información complementaria.
Adapta los textos a los idiomas existentes.
Aceptación: nombre y enlaces aparecen en el HTML servido. Se pueden seguir sin depender exclusivamente de controladores JavaScript de clic.

## Tarea 5. Corregir el idioma del documento HTML
Prioridad: media. Dominio: evolve2digital.com.
La auditoría encontró `lang="es"` en las portadas inglesa e italiana.
Genera el atributo desde el idioma real:

```
/es → <html lang="es">
/en → <html lang="en">
/it → <html lang="it">
```

Revisa el layout que realmente genera `<html>` y adapta la solución a la versión instalada del framework.
No resuelvas el problema añadiendo etiquetas `<html>` anidadas ni corrigiendo únicamente el DOM desde un efecto de cliente.
Aceptación: el HTML inicial servido declara el idioma correcto en portadas y páginas interiores representativas.

## Tarea 6. Traducir correctamente las páginas de cookies
Prioridad: media. Dominio: evolve2digital.com.
Revisa:

```
/en/cookies
/it/cookies
```

En la auditoría, sus títulos estaban traducidos, pero el encabezado y el cuerpo principal continuaban en español.
Implementa las traducciones correspondientes utilizando el contenido real existente como fuente. Conserva su significado y no añadas compromisos jurídicos o categorías de cookies que no estén acreditados.
Alinea:

* Contenido y encabezados.
* Atributo `lang`.
* Título y descripción.
* Canonical.
* Alternancias `hreflang`.
* Enlaces del selector de idioma.

Aceptación: cada variante contiene su traducción completa. Si falta revisión editorial, indícalo expresamente en la entrega.

## Tarea 7. Resolver el destino de contacto del JSON-LD
Prioridad: media. Dominio: evolve2digital.com.
El marcado declara:

```
"potentialAction": {
  "@type": "ContactAction",
  "target": "https://evolve2digital.com/es#contact"
}
```

La auditoría no encontró `id="contact"` en el HTML inicial.
Inspecciona primero cómo funciona el contacto actual. Después aplica la solución coherente:

* Una sección real con `id="contact"`.
* Una página de contacto existente.
* Un mecanismo de enlace directo al formulario o modal que funcione realmente.

No dupliques formularios innecesariamente.
Aceptación: abrir directamente el destino declarado permite llegar al contacto. Comprueba también los botones, el correo y WhatsApp.

## Tarea 8. Corregir los datos de ubicación
Prioridad: baja. Dominio: evolve2digital.com.
El marcado publica:

```
addressCountry = ES
addressLocality = España
```

"España" no debe utilizarse como localidad.
Sustituye ese valor únicamente si existe una localidad verdadera y publicable acreditada. En caso contrario, retira `addressLocality`.
Utiliza `areaServed` para expresar la zona donde se prestan servicios.
Aceptación: el marcado distingue ubicación y cobertura comercial. No se inventan oficinas, direcciones ni atención presencial.

## Tarea 9. Crear páginas propias de profesional y servicios
Prioridad: media. Dominio: evolve2digital.com.
Antes de crear rutas, comprueba si ya existen páginas equivalentes. Amplíalas o reutilízalas para evitar duplicados.

### Perfil profesional
Ruta propuesta:

```
/es/alberto-carrasco
```

Incluye nombre, relación con Evolve2Digital, especialidades, experiencia verificable, proyectos, perfiles confirmados y contacto.
Relaciona la página con la entidad:

```
https://evolve2digital.com#person
```

Cuando exista, actualiza las referencias de autor y los enlaces correspondientes para apuntar a ella.

### Desarrollo de software
Ruta propuesta:

```
/es/desarrollo-software-madrid
```

Explica problemas que resuelve el servicio, tipos de proyecto, proceso, integraciones, criterios de presupuesto, ejemplos y mantenimiento.
Describe el servicio a empresas de Madrid sin inventar una oficina física. Evita multiplicar páginas casi idénticas por municipios.

### Automatización e IA
Ruta propuesta:

```
/es/automatizacion-procesos-ia
```

Explica procesos concretos, herramientas conectables, datos necesarios, intervención humana, límites y mantenimiento.
Distingue casos de clientes, proyectos propios y demostraciones. No presentes un flujo propuesto de albaranes como caso real sin evidencia.
Aceptación de las tres páginas: contenido útil y diferenciado, estado 200, enlaces internos, metadatos propios, canonical e idioma correctos. Incorpóralas al sitemap cuando estén implementadas.

## Tarea 10. Reescribir la FAQ corporativa
Prioridad: media. Dominio: evolve2digital.com.
Revisa las respuestas actuales y sustituye rankings externos no acreditados, precios ajenos sin contexto y afirmaciones absolutas por información comprobable del servicio.
Utiliza preguntas como:

* ¿Quién desarrolla mi proyecto?
* ¿Puedes integrar mis herramientas actuales?
* ¿Cómo se calcula el presupuesto?
* ¿Qué código y documentación se entregan?
* ¿Qué mantenimiento necesita la solución?
* ¿Dónde puedo ver ejemplos?

Escribe en primera persona cuando responda Alberto. No inventes precios, plazos, derechos contractuales o condiciones de soporte.
Genera la interfaz y `FAQPage` desde una misma fuente de contenido.
Aceptación: las respuestas pueden abrirse y leerse, son accesibles y coinciden con el JSON-LD. La auditoría estática no demostró que el acordeón estuviera roto: compruébalo antes de modificar su funcionamiento.

## Tarea 11. Actualizar el caso de Ferdy
Prioridad: media. Dominio: evolve2digital.com.
Revisa el artículo existente:

```
/es/blog/de-atender-curiosos-a-cerrar-clientes-la-web-de-ferdy
```

El texto auditado conservaba referencias a pocas semanas en producción y anunciaba una actualización de métricas en tres meses.
Actualiza las referencias temporales y utiliza los datos verificables disponibles.
Separa:

* Funciones entregadas.
* Observaciones del cliente.
* Resultados medidos.

Si no hay métricas fiables disponibles, indícalo. No generes porcentajes, ingresos, ahorros ni testimonios.
Conserva la URL existente y actualiza las fechas de modificación únicamente cuando haya cambios reales.
Aceptación: las afirmaciones están respaldadas y el artículo describe un estado temporal coherente. Documenta cualquier dato pendiente de aportar.

## Tarea 12. Revisar el tratamiento de la documentación interna
Prioridad: condicionada a su finalidad. Dominio: evolve2digital.com.
La ruta `/es/docs` se presenta como documentación interna, pero responde públicamente, permite indexación y figura en el sitemap.
Comprueba la intención documentada del proyecto:

* Si es pública, presenta su finalidad de forma coherente.
* Si es pública pero debe quedar fuera de resultados, aplica `noindex` y retírala del sitemap, permitiendo leer la directiva.
* Si debe ser privada, utiliza autenticación y autorización.

Si la finalidad no está acreditada, documenta la decisión pendiente y continúa con las demás tareas. No cambies arbitrariamente su privacidad.
Aceptación: acceso, metadatos y sitemap responden a la finalidad definida. Ocultar enlaces o utilizar robots.txt no sustituye la autenticación.

## Tarea 13. Consolidar el host del portfolio
Prioridad: baja y opcional. Dominio: e2dprojects.com.
La auditoría encontró respuestas 200 con y sin `www`. Los canonicals, alternancias y sitemap prefieren el host sin `www`.
Si tienes acceso a la configuración correspondiente, configura una redirección permanente desde `www` hacia el dominio preferido.
Conserva ruta y parámetros necesarios. Evita duplicar reglas en infraestructura y aplicación.
Aceptación: redirección correcta, HTTPS válido, ausencia de bucles y coherencia con canonical y sitemap.
Si requiere una configuración externa inaccesible, entrega la instrucción concreta pendiente. No bloquees el resto de cambios por esta optimización.

## Tarea 14. Revisar metadatos, sitemap y validación final
Después de implementar:

* Comprueba los grafos JSON-LD y sus relaciones.
* Revisa canonical, idiomas y alternancias.
* Incluye únicamente páginas públicas apropiadas en el sitemap.
* Utiliza fechas de modificación veraces.
* Verifica los recursos permitidos por robots.
* Comprueba enlaces, navegación, contacto y acordeones.
* Ejecuta compilación y comprobaciones exigidas por el repositorio.

Añade pruebas específicas cuando aporten valor: reglas efectivas de robots, idioma del HTML servido y consistencia de IDs. No instales una infraestructura de pruebas innecesaria para simples cambios de contenido.
Distingue comprobaciones realizadas en local, previsualización y producción.

## Entrega
Devuelve una tabla por tarea con:

* Estado: implementada, ya resuelta, pendiente de dato o pendiente de acceso.
* Archivos modificados.
* Cambio realizado.
* Verificación ejecutada y resultado.
* Dependencias pendientes.

Entrega los cambios siguiendo el flujo de revisión y publicación del proyecto.
Describe lo realmente implementado y comprobado. No atribuyas mejoras de ranking, indexación o recomendaciones de ChatGPT que no se hayan medido.
