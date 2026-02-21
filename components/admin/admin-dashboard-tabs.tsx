"use client"

import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { DeletePostButton } from "@/components/admin/delete-post-button"
import { BudgetWebhookForm } from "@/components/admin/budget-webhook-form"

export type AdminPostRow = {
  title: string
  locale: string
  slug: string
  date: string
  published: boolean
  sourceFilePath: string
}

export function AdminDashboardTabs({ posts }: { posts: AdminPostRow[] }) {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <Tabs defaultValue="cms">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="cms">CMS Blog</TabsTrigger>
              <TabsTrigger value="budget">Presupuesto</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <form action="/api/admin/logout" method="post">
                <Button variant="outline" type="submit">
                  Salir
                </Button>
              </form>
            </div>
          </div>

          <TabsContent value="cms" className="space-y-4">
            <header className="flex items-center justify-between gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold">CMS Blog</h1>
              <Link href="/admin/new">
                <Button>Nuevo post</Button>
              </Link>
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
                      <td className="p-3">{post.sourceFilePath}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/edit?file=${encodeURIComponent(post.sourceFilePath)}`}
                            className="underline"
                          >
                            Editar
                          </Link>
                          <DeletePostButton file={post.sourceFilePath} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="budget" className="space-y-4">
            <header className="space-y-1">
              <h1 className="text-2xl font-semibold">Presupuesto</h1>
              <p className="text-sm text-muted-foreground">
                Formulario para llamar al webhook y visualizar la respuesta.
              </p>
            </header>
            <BudgetWebhookForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

