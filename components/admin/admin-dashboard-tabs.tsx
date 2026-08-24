"use client"

import { useMemo, useState, type MouseEvent } from "react"
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

const LOCALES = ["es", "en", "it"] as const

type LocaleFilterProps = {
  active: Set<string>
  onChange: (next: Set<string>) => void
}

function LocaleFilter({ active, onChange }: LocaleFilterProps) {
  const allActive = active.size === 0

  const handleClick = (locale: string) => (event: MouseEvent<HTMLButtonElement>) => {
    const additive = event.ctrlKey || event.metaKey
    const next = new Set(active)
    if (additive) {
      if (next.has(locale)) next.delete(locale)
      else next.add(locale)
    } else {
      next.clear()
      next.add(locale)
    }
    onChange(next)
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-muted-foreground">Idioma:</span>
      <Button
        type="button"
        size="sm"
        variant={allActive ? "default" : "outline"}
        aria-pressed={allActive}
        onClick={() => onChange(new Set())}
      >
        Todos
      </Button>
      {LOCALES.map((locale) => {
        const isOn = active.has(locale)
        return (
          <Button
            key={locale}
            type="button"
            size="sm"
            variant={isOn ? "default" : "outline"}
            aria-pressed={isOn}
            title="Click para filtrar; Ctrl/Cmd-click para combinar idiomas"
            onClick={handleClick(locale)}
          >
            {locale.toUpperCase()}
          </Button>
        )
      })}
    </div>
  )
}

export function AdminDashboardTabs({ posts }: { posts: AdminPostRow[] }) {
  const [activeLocales, setActiveLocales] = useState<Set<string>>(new Set())

  const visiblePosts = useMemo(() => {
    if (activeLocales.size === 0) return posts
    return posts.filter((post) => activeLocales.has(post.locale))
  }, [posts, activeLocales])

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
              <Link href="/admin/prompts">
                <Button variant="outline">Prompts del agente</Button>
              </Link>
              <Link href="/admin/embeddings">
                <Button variant="outline">Embeddings (RAG)</Button>
              </Link>
              <Link href="/admin/architecture">
                <Button variant="outline">Arquitectura</Button>
              </Link>
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

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <LocaleFilter
                active={activeLocales}
                onChange={(next) => setActiveLocales(next)}
              />
              <span className="text-sm text-muted-foreground">
                {visiblePosts.length} {visiblePosts.length === 1 ? "post" : "posts"}
              </span>
            </div>

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
                  {visiblePosts.map((post) => (
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

