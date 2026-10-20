import type { ReactNode } from "react"
import { notFound } from "next/navigation"
import { Navigation } from "@/components/layout/navigation"
import { Footer } from "@/components/layout/footer"
import { LocaleAlternatesProvider } from "@/components/layout/locale-alternates-context"
import { spanishOnlyPath, type SpanishOnlySlug } from "@/lib/seo/static-pages"

/**
 * These pages have no translation: /en|it/<slug> must answer 404. Never
 * `redirect()` here (tasks/lessons.md 2026-09-28): the page is prerendered for
 * every locale and a cached redirect loses its Location header.
 */
export function ensureSpanishLocale(locale: string): void {
  if (locale !== "es") notFound()
}

interface SpanishOnlyPageProps {
  slug: SpanishOnlySlug
  children: ReactNode
}

export function SpanishOnlyPage({ slug, children }: SpanishOnlyPageProps) {
  // The language switcher goes to each locale's home: replacing the first path
  // segment would land on a 404 for a page that is not translated.
  const alternates = { es: spanishOnlyPath(slug), en: "/en", it: "/it" }

  return (
    <LocaleAlternatesProvider alternates={alternates}>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="pt-16">{children}</main>
        <Footer />
      </div>
    </LocaleAlternatesProvider>
  )
}
