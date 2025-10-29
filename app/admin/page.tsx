import { allPosts } from "@/.contentlayer/generated"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DeletePostButton } from "@/components/admin/delete-post-button"

export default function AdminDashboardPage() {
  const posts = allPosts
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">CMS Blog</h1>
          <div className="flex items-center gap-2">
            <form action="/api/admin/logout" method="post">
              <Button variant="outline" type="submit">Salir</Button>
            </form>
            <Link href="/admin/new">
              <Button>Nuevo post</Button>
            </Link>
          </div>
        </header>

        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left p-3">Título</th>
                <th className="text-left p-3">Locale</th>
                <th className="text-left p-3">Slug</th>
                <th className="text-left p-3">Fecha</th>
                <th className="text-left p-3">Publicado</th>
                <th className="text-left p-3">Archivo</th>
                <th className="text-left p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={`${post.slug}-${post.locale}`} className="border-t">
                  <td className="p-3">{post.title}</td>
                  <td className="p-3">{post.locale}</td>
                  <td className="p-3">{post.slug}</td>
                  <td className="p-3">{new Date(post.date).toISOString().slice(0, 10)}</td>
                  <td className="p-3">{post.published ? "Sí" : "No"}</td>
                  <td className="p-3">{post._raw.sourceFilePath}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/edit?file=${encodeURIComponent(post._raw.sourceFilePath)}`} className="underline">Editar</Link>
                      <DeletePostButton file={post._raw.sourceFilePath} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}