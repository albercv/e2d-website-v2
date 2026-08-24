import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { fromProjectRoot } from "@/lib/server/project-root"

// Los entregables del mapa de arquitectura viven en staging/architecture/
// (fuera de .next), igual que content/.
export function getArchitectureDir(): string {
  return fromProjectRoot("staging", "architecture")
}
type ArchitectureFile = "index.html" | "index-3d.html" | "architecture.json"

const CONTENT_TYPES: Record<ArchitectureFile, string> = {
  "index.html": "text/html; charset=utf-8",
  "index-3d.html": "text/html; charset=utf-8",
  "architecture.json": "application/json; charset=utf-8",
}

// Sirve un entregable estático del mapa. Nunca cachear ni indexar: es
// documentación interna del admin y se regenera fuera del build.
export async function serveArchitectureFile(file: ArchitectureFile): Promise<NextResponse> {
  try {
    const body = await fs.readFile(path.join(getArchitectureDir(), file), "utf-8")
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": CONTENT_TYPES[file],
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    })
  } catch {
    return NextResponse.json(
      { error: "architecture deliverable not generated", hint: `falta staging/architecture/${file} en el deploy` },
      { status: 404 }
    )
  }
}
