import { promises as fs } from "fs"
import path from "path"
import Link from "next/link"
import { AdminMdxEditor } from "@/components/admin/editor"
import { Button } from "@/components/ui/button"

function sanitizeRelativeFile(rel: string) {
  if (!rel || rel.startsWith("/") || rel.includes("..")) throw new Error("Ruta inválida")
  return rel
}

export default async function EditPostPage({ searchParams }: { searchParams: Promise<{ file?: string }> }) {
  const { file } = await searchParams
  if (!file) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <h1 className="text-2xl font-semibold">Editor</h1>
          <p className="text-muted-foreground">Falta el parámetro "file"</p>
          <Link href="/admin"><Button variant="outline">Volver</Button></Link>
        </div>
      </div>
    )
  }

  const rel = sanitizeRelativeFile(file)
  const filePath = path.join(process.cwd(), "content", rel)
  let mdx = ""
  try {
    mdx = await fs.readFile(filePath, "utf8")
  } catch (e) {
    mdx = `---\n` +
      `title: ""\n` +
      `description: ""\n` +
      `date: "${new Date().toISOString().slice(0, 10)}"\n` +
      `locale: es\n` +
      `slug: ""\n` +
      `published: false\n` +
      `---\n\n`
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Editando: {rel}</h1>
          <Link href="/admin"><Button variant="outline">Volver</Button></Link>
        </div>
        <AdminMdxEditor file={rel} initial={mdx} />
      </div>
    </div>
  )
}