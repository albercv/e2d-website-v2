# Caso de Ferdy revisado (tarea 11 de la auditoría, 2026-10-20)

El caso de Ferdy **no está en git**: vive solo en el volumen de producción
(`/var/lib/e2d-content/posts/`). Esta carpeta contiene los tres textos
revisados, listos para publicar, y los pasos exactos para aplicarlos. Nada de
esto se ha escrito en el volumen.

| Idioma | Fichero revisado | Diff contra el original | Slug (sin cambios) |
|---|---|---|---|
| es | `es.mdx` | `es.diff` | `de-atender-curiosos-a-cerrar-clientes-la-web-de-ferdy` |
| en | `en.mdx` | `en.diff` | `from-fielding-curious-visitors-to-closing-clients-ferdys-website` |
| it | `it.mdx` | `it.diff` | `da-rispondere-ai-curiosi-a-chiudere-clienti-il-sito-di-ferdy` |

Los tres originales sobre los que se hizo el trabajo tienen estos SHA-256
(comprueba que siguen siendo así antes de aplicar nada; si alguno difiere,
alguien ha editado el post y hay que regenerar el diff):

```
f6b4e769ea0428264d229008e235a9bbd7f9bc7fecdad9913ec2c8642d78d988  es (6864 B)
6336118fb720272405be0107ed443b0e494e02059db6d5ae30252a21b7fdebb0  en (6547 B)
9b84ebe432900c77cb193fb718555c4b8135a6731a4e46684fc68498fb125f44  it (7199 B)
```

## 1. Qué cambia y por qué

Problema de la auditoría: el caso presentaba como hechos cifras y plazos que
no se pueden demostrar (comparación con agencias, "pocas semanas en
producción", promesa de métricas "en 3 meses", "el 100% de los mensajes").

Cambios, iguales en los tres idiomas (solo el cuerpo; el frontmatter es
idéntico byte a byte salvo una línea nueva, `updated: 2026-10-20`, justo
debajo de `date`):

- **Eliminado**: el párrafo de la comparación con agencias (8.000 a 15.000 €,
  3 a 5 meses) y su frase final sobre "sobreempaquetado"; la frase "Ferdy lleva
  pocas semanas con la web en producción"; la promesa de volver al caso "en 3
  meses" con métricas; "el 100% de los mensajes empezaban desde cero" (queda
  "los mensajes empezaban desde cero"); "desde el primer día".
- **Reestructurado** en secciones separadas:
  - **Funciones entregadas** (antes "Lo que construimos"): solo lo que el
    original dice que se construyó, más el stack.
  - **Lo que observa Ferdy** (antes "El cambio"): las observaciones de antes y
    ahora, atribuidas expresamente a Ferdy ("según Ferdy"), con aviso de que no
    son una medición. Conserva `[video:testimonio]` y la cita literal.
  - **Resultados medidos** (antes "Métricas: por qué todavía no las
    publicamos"): dice con claridad que a 20 de octubre de 2026 no hay
    métricas medidas publicables y lista los datos que harían falta, sin
    ninguna cifra.
- **Se mantiene** tal cual: plazo de 1 mes y "parte de 3.000 €" (afirmaciones
  del autor, sección "Tiempo, alcance e inversión"), el CTA final con email y
  WhatsApp, el texto de "El problema" y "Por qué una web normal no servía".
- **Retoques menores**, a revisar: "Wordpress" pasa a "WordPress" (es, it);
  "funciona y no se rompe" pasa a "funcione" (es, en, it), porque "no se
  rompe" es una garantía que no se puede demostrar.

Ver `es.diff`, `en.diff` e `it.diff` para el detalle exacto
(`diff -u original revisado`).

### Mismo mecanismo en el código

La rama `fix/audit-ferdy-dates` añade el campo opcional `updated`
(AAAA-MM-DD) al frontmatter: alimenta `dateModified` del JSON-LD
(BlogPosting), el `lastmod` del sitemap y `article:modified_time` de Open
Graph. Sin `updated`, o con un valor inválido, todo sigue usando `date`. La
línea `updated: 2026-10-20` de los ficheros revisados solo tiene efecto cuando
ese código está desplegado; antes de eso se ignora sin romper nada.

## 2. Datos pendientes de Alberto / Ferdy

Para poder rellenar de verdad "Resultados medidos" hace falta:

1. **Porcentaje de mensajes de WhatsApp que se saltan la fase de
   explicación.** Pide a Ferdy un recuento sobre un periodo definido (por
   ejemplo, los últimos 30 días) y una referencia de "antes" con el mismo
   criterio; sin línea base no hay comparación honesta.
2. **Tiempo medio desde el primer contacto hasta la reserva.** Fechas del
   primer mensaje (WhatsApp) y de la reserva (Stripe o calendario de Ferdy).
3. **Reservas y ventas originadas directamente en la web** (sesiones y
   ebooks). Fuente posible: panel de Stripe; confirmar si
   ferdycoachdesamor.com tiene analítica instalada para atribuir el origen.
4. **Permiso de Ferdy para publicar cifras** y, ya que ahora las
   observaciones van atribuidas a él, **confirmación de que se reconoce en la
   redacción** de "Lo que observa Ferdy".
5. **Confirmar que siguen vigentes** el plazo de 1 mes y el "parte de 3.000 €".

Cuando existan, se editan solo las tres viñetas y el primer párrafo de
"Resultados medidos" y se actualiza `updated`.

## 3. Pasos para aplicar (Alberto)

Todo se ejecuta como root en el servidor. Estos pasos escriben en el volumen
de producción, así que **los ejecutas tú**; cada escritura generará eventos de
auditd (ver paso 3).

Variables comunes:

```bash
P=/var/lib/e2d-content/posts
ES=de-atender-curiosos-a-cerrar-clientes-la-web-de-ferdy
EN=from-fielding-curious-visitors-to-closing-clients-ferdys-website
IT=da-rispondere-ai-curiosi-a-chiudere-clienti-il-sito-di-ferdy
# Carpeta de este repo con los ficheros revisados (ajusta la ruta del checkout)
R=<checkout>/docs/audit-fixes-2026-10-20/ferdy
```

### 1) Copias de seguridad de los tres originales

Fuera del directorio vigilado (`$P`), para no ensuciar el volumen ni las
reglas de auditd:

```bash
mkdir -p /root/backups/ferdy-20261020
for f in "$ES" "$EN" "$IT"; do
  cp -p "$P/$f.mdx" "/root/backups/ferdy-20261020/$f.mdx.bak.20261020"
done
sha256sum /root/backups/ferdy-20261020/*.bak.20261020   # debe coincidir con la tabla de arriba
```

(El lector de posts solo carga ficheros que terminan en `.mdx`, así que un
`.bak.20261020` dentro de `$P` tampoco aparecería en el blog, pero mejor fuera.)

### 2) Publicar: dos opciones

**Opción A (recomendada): sustituir los ficheros con `cp`.** Conserva el
frontmatter byte a byte y el SHA-256 resultante es predecible.

```bash
cp "$R/es.mdx" "$P/$ES.mdx"
cp "$R/en.mdx" "$P/$EN.mdx"
cp "$R/it.mdx" "$P/$IT.mdx"
sha256sum "$P/$ES.mdx" "$P/$EN.mdx" "$P/$IT.mdx"
# esperado:
# 44eb711359cfdcf910f8677f4be75a0ebfaee07d0328d16404f03155dea9b000  es
# ae63f7648c04660d2dc3decf4eb96e5a2f59c88c6797598cc5ae01d54af3762b  en
# 06827c1bfed3d9b35ee9ef02e2a2d1228941aa833c99701b4d3d7df697ffbf33  it
```

`cp` sobre un fichero existente lo trunca y reescribe en el mismo inode: el
fichero nunca desaparece (el tripwire no se dispara) y conserva dueño y modo.

**Opción B: por el MCP del blog, solo cuerpo, y la línea `updated` a mano.**
`posts_update_frontmatter` no admite el campo `updated` (solo title,
description, tags, author, published, date y cover), así que la línea hay que
añadirla a mano.

1. Para cada idioma, llama a `posts_update_body` con `slug`, `locale` y como
   `content` el cuerpo del fichero revisado (todo lo que va después del
   segundo `---`). Para extraerlo:

   ```bash
   awk 'c>=2{print} /^---$/{c++}' "$R/es.mdx" | sed '1{/^$/d}'
   ```

   Slugs y locales: `$ES`/`es`, `$EN`/`en`, `$IT`/`it`.
2. Añade `updated` justo debajo de `date` en cada fichero:

   ```bash
   for f in "$ES" "$EN" "$IT"; do
     grep -q '^updated:' "$P/$f.mdx" || sed -i '/^date: /a updated: 2026-10-20' "$P/$f.mdx"
   done
   grep -n '^date:\|^updated:' "$P/$ES.mdx" "$P/$EN.mdx" "$P/$IT.mdx"
   ```

Efecto lateral de la opción B: `updatePostBody` reescribe el frontmatter con
gray-matter (`description` como bloque `>-`, `date: 2026-05-06T00:00:00.000Z`,
tags como lista). Es equivalente para el lector, pero el fichero ya no es
byte a byte el del repo y su SHA-256 será distinto del esperado arriba. Para
`updated` da igual: el lector acepta tanto `2026-10-20` como la forma ISO
larga.

**¿Hace falta reiniciar o hacer rebuild?** No. `listPostsFromDisk()`
(`lib/blog/posts-runtime.ts`) calcula en cada llamada una huella
`ruta:mtime:tamaño` de todos los `.mdx` y relee los que cambian; además
`/[locale]/blog/[slug]`, el índice del blog y `sitemap.xml` son
`force-dynamic`. Los cambios aparecen en la siguiente petición. **No llames a
`posts_rebuild`** (tumba la web unos 3 minutos) ni hagas `pm2 restart` por
esto. Lo que sí requiere build y `pm2 restart e2d` es desplegar el código de
`updated` (rama `fix/audit-ferdy-dates`); hasta entonces `dateModified`,
`lastmod` y `modified_time` seguirán mostrando la fecha de publicación.
Si hay caché por delante (Cloudflare, nginx), usa el parámetro de ejemplo del
paso 4 para saltártela al verificar.

### 3) Refrescar la línea base de vigilancia (stack Ferdy)

Cambia el contenido del post vigilado, así que cambia su SHA-256. Hazlo **después**
de publicar y de verificar, desde el checkout de producción:

```bash
cd /root/e2dProject/e2d-website-v2
cat logs/ferdy-baseline.txt                      # mira el formato actual (sha256 + stat)
cp -p logs/ferdy-baseline.txt logs/ferdy-baseline.txt.bak.20261020
cp -p logs/ferdy-baseline.mdx logs/ferdy-baseline.mdx.bak.20261020
chmod u+w logs/ferdy-baseline.mdx
cp "$P/$ES.mdx" logs/ferdy-baseline.mdx && chmod 0444 logs/ferdy-baseline.mdx
{ date -u +%FT%TZ; sha256sum "$P/$ES.mdx"; stat "$P/$ES.mdx"; } > logs/ferdy-baseline.txt
```

Luego actualiza a mano el SHA-256 de referencia que figura en las notas del
stack de vigilancia (hoy `f6b4e769…8d988`, 6864 B).

Qué esperar:

- **auditd** (regla `e2d_posts`, `-w /var/lib/e2d-content/posts -p wa`)
  registrará escrituras y cambios de atributos de tus `cp`/`sed` o del
  proceso `node` si usas el MCP. Es normal. Compruébalo con
  `ausearch -k e2d_posts -ts recent -i` y verifica que el PID/exe son los de
  tu sesión o de `node` (MCP) y no otro.
- **PM2 `ferdy-tripwire`** solo comprueba que el fichero **es** (existe) cada
  180 s. Ni `cp` ni la escritura atómica del MCP lo hacen desaparecer, así
  que no debe generarse ningún `logs/ferdy-disappeared-*.txt` nuevo. Si
  aparece uno con fecha 2026-10-20 o posterior, trátalo como incidente y
  restaura desde `/root/backups/ferdy-20261020/`.
- `posts-watchdog` (inotify) puede registrar los mismos eventos.

### 4) Verificación

```bash
B=https://evolve2digital.com
U_ES=$B/es/blog/de-atender-curiosos-a-cerrar-clientes-la-web-de-ferdy
U_EN=$B/en/blog/from-fielding-curious-visitors-to-closing-clients-ferdys-website
U_IT=$B/it/blog/da-rispondere-ai-curiosi-a-chiudere-clienti-il-sito-di-ferdy

# 200 y contenido nuevo (el parámetro nc evita cachés intermedias)
for u in "$U_ES" "$U_EN" "$U_IT"; do
  echo "== $u"
  curl -s -o /dev/null -w '%{http_code}\n' "$u?nc=$(date +%s)"
done
curl -s "$U_ES?nc=$(date +%s)" | grep -c 'Resultados medidos'          # >= 1
curl -s "$U_EN?nc=$(date +%s)" | grep -c 'Measured results'            # >= 1
curl -s "$U_IT?nc=$(date +%s)" | grep -c 'Risultati misurati'          # >= 1

# Lo retirado ya no está (esperado: 0 en los tres; si sale más, inspecciona la coincidencia)
for u in "$U_ES" "$U_EN" "$U_IT"; do
  curl -s "$u?nc=$(date +%s)" | grep -ciE '8\.000|8,000|15\.000|15,000|pocas semanas|few weeks|poche settimane|3 meses|3 months|3 mesi'
done

# Fecha de modificación (requiere el código de `updated` desplegado)
for u in "$U_ES" "$U_EN" "$U_IT"; do
  curl -s "$u?nc=$(date +%s)" | grep -o '"dateModified":"[^"]*"'              # 2026-10-20
  curl -s "$u?nc=$(date +%s)" | grep -o 'article:modified_time" content="[^"]*"'   # 2026-10-20
done
curl -s "$B/sitemap.xml?nc=$(date +%s)" | grep -A1 'blog/de-atender-curiosos' | head -4   # <lastmod> 2026-10-20...

# El vídeo del testimonio y la cita siguen
curl -s "$U_ES?nc=$(date +%s)" | grep -c 'Estoy más contento'            # >= 1
```

## 4. Fuera de alcance (decisión tuya)

Se dejó el frontmatter intacto, como se pidió, pero conviene revisar estos
campos con `posts_update_frontmatter`:

- **description (es, it)**: afirma "20 veces al día" (cifra sin fuente) y
  promete "Caso real, stack y números", cuando el caso ya dice que no hay
  números. Sugerencia (es): "Cómo Ferdy, coach emocional, ha pasado de explicar
  lo mismo una y otra vez en WhatsApp a recibir consultas más informadas. Una
  web a medida que explica, cobra y reserva. Caso real y stack." (it análoga.)
- **description (en)**: "Every day he spent hours on WhatsApp" es otra cifra sin
  fuente.
- **Marcadores**: solo la versión en inglés usa `<Lead>`, `[image:hero]` y el
  marcador `[contact]` al final; es e it no los tienen. No se ha tocado.
