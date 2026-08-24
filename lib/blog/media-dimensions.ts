// lib/blog/media-dimensions.ts
// Lee width/height de un fichero de imagen del volumen de uploads, con caché
// por mtime. Solo lectura — nunca escribe en el volumen.
import { promises as fs } from "fs"
import { imageSize } from "image-size"

// getCompiledPost corre en cada request (la ruta de blog es force-dynamic),
// así que sin throttle cada request re-haría fs.stat de cada imagen aunque
// el fichero no haya cambiado en meses. 60s de staleness es aceptable para
// media de blog — no es contenido que cambie en caliente — y evita el coste
// de stat por request manteniendo el mtime-check como fuente de verdad tras
// esa ventana. El Map es deliberadamente ilimitado: la librería de media de
// un blog es pequeña (decenas/cientos de ficheros), no miles.
const STAT_THROTTLE_MS = 60_000

interface DimsEntry {
  mtimeMs: number
  dims: { width: number; height: number } | null
  checkedAt: number
}

const cache = new Map<string, DimsEntry>()

export async function readImageDimensions(
  absPath: string
): Promise<{ width: number; height: number } | null> {
  const hit = cache.get(absPath)
  const now = Date.now()
  if (hit && now - hit.checkedAt < STAT_THROTTLE_MS) return hit.dims
  try {
    const stat = await fs.stat(absPath)
    if (hit && hit.mtimeMs === stat.mtimeMs) {
      hit.checkedAt = now
      return hit.dims
    }
    const buf = await fs.readFile(absPath)
    const size = imageSize(buf)
    const dims = size.width && size.height ? { width: size.width, height: size.height } : null
    cache.set(absPath, { mtimeMs: stat.mtimeMs, dims, checkedAt: now })
    return dims
  } catch {
    return null
  }
}
