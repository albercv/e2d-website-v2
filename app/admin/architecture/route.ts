import { serveArchitectureFile } from "@/lib/admin/architecture"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  return serveArchitectureFile("index.html")
}
