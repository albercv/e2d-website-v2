// lib/blog/media-dimensions.ts
// Lee width/height de un fichero de imagen del volumen de uploads, con caché
// por mtime. Solo lectura — nunca escribe en el volumen.
import { promises as fs } from "fs"
import { imageSize } from "image-size"

interface DimsEntry {
  mtimeMs: number
  dims: { width: number; height: number } | null
}

const cache = new Map<string, DimsEntry>()

export async function readImageDimensions(
  absPath: string
): Promise<{ width: number; height: number } | null> {
  try {
    const stat = await fs.stat(absPath)
    const hit = cache.get(absPath)
    if (hit && hit.mtimeMs === stat.mtimeMs) return hit.dims
    const buf = await fs.readFile(absPath)
    const size = imageSize(buf)
    const dims = size.width && size.height ? { width: size.width, height: size.height } : null
    cache.set(absPath, { mtimeMs: stat.mtimeMs, dims })
    return dims
  } catch {
    return null
  }
}
