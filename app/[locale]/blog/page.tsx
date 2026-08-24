import { listPostsFromDisk, resolvePostCovers } from "@/lib/blog/posts-runtime"
import { buildHreflangLanguages } from "@/lib/seo/hreflang"
import { buildBlogListUrl, paginatePosts } from "@/app/[locale]/blog/pagination"
import { normalizeQuery, searchPosts } from "@/lib/blog/search"
import { BlogList } from "@/components/blog/blog-list"
import { Navigation } from "@/components/layout/navigation"
import { Footer } from "@/components/layout/footer"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"

interface BlogPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string; q?: string }>
}

const PAGINATION_LABELS: Record<string, string> = {
  es: "Paginación",
  en: "Pagination",
  it: "Paginazione",
}

export async function generateMetadata({ params, searchParams }: BlogPageProps): Promise<Metadata> {
  const { locale } = await params
  const { page: pageParam, q: qParam } = await searchParams
  const query = normalizeQuery(qParam)

  const titles: Record<string, string> = {
    es: "Blog - E2D | Automatización y Tecnología",
    en: "Blog - E2D | Automation and Technology",
    it: "Blog - E2D | Automazione e Tecnologia",
  }

  const descriptions: Record<string, string> = {
    es: "Artículos sobre automatización, chatbots, desarrollo web y tecnología para PYMEs",
    en: "Articles about automation, chatbots, web development and technology for SMEs",
    it: "Articoli su automazione, chatbot, sviluppo web e tecnologia per PMI",
  }

  const baseUrl = "https://evolve2digital.com"
  const ogLocale = locale === "es" ? "es_ES" : locale === "en" ? "en_US" : "it_IT"
  const smeWord = locale === "es" ? "PYME" : locale === "it" ? "PMI" : "SME"

  const all = await listPostsFromDisk()
  const filtered = all.filter((post) => post.locale === locale && post.published)
  const { page } = paginatePosts(searchPosts(filtered, query), pageParam)
  // Resultados de búsqueda: no indexar y canonical a la lista sin query.
  const canonicalUrl = `${baseUrl}${buildBlogListUrl(locale, { page: query ? undefined : page })}`

  return {
    title: titles[locale] ?? titles.es,
    description: descriptions[locale] ?? descriptions.es,
    alternates: {
      canonical: canonicalUrl,
      languages: buildHreflangLanguages({
        es: `${baseUrl}/es/blog`,
        en: `${baseUrl}/en/blog`,
        it: `${baseUrl}/it/blog`,
      }),
    },
    openGraph: {
      type: "website",
      locale: ogLocale,
      url: `${baseUrl}/${locale}/blog`,
      siteName: "E2D - Evolve2Digital",
      title: titles[locale] ?? titles.es,
      description: descriptions[locale] ?? descriptions.es,
    },
    twitter: {
      card: "summary_large_image",
      title: titles[locale] ?? titles.es,
      description: descriptions[locale] ?? descriptions.es,
    },
    robots: {
      index: !query,
      follow: true,
    },
    keywords: [
      locale === "es" ? "automatización" : locale === "it" ? "automazione" : "automation",
      "chatbots",
      "WhatsApp",
      "voicebots",
      smeWord,
      "blog",
    ],
  }
}

export default async function BlogPage({ params, searchParams }: BlogPageProps) {
  const { locale } = await params
  const { page: pageParam, q: qParam } = await searchParams
  const query = normalizeQuery(qParam)

  if (!["es", "en", "it"].includes(locale)) {
    notFound()
  }

  const all = await listPostsFromDisk()
  const filtered = all
    .filter((post) => post.locale === locale && post.published)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const { pagePosts, totalPages, page } = paginatePosts(searchPosts(filtered, query), pageParam)
  const posts = await resolvePostCovers(pagePosts)

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-16">
        <BlogList posts={posts} locale={locale} query={query} />
        {totalPages > 1 && (
          <nav aria-label={PAGINATION_LABELS[locale] ?? PAGINATION_LABELS.es} className="flex justify-center gap-2 pb-16">
            {page > 1 && (
              <a href={buildBlogListUrl(locale, { page: page - 1, q: query })} className="px-4 py-2 rounded-md border border-border hover:border-[#05b4ba]">←</a>
            )}
            <span className="px-4 py-2 text-muted-foreground">{page} / {totalPages}</span>
            {page < totalPages && (
              <a href={buildBlogListUrl(locale, { page: page + 1, q: query })} className="px-4 py-2 rounded-md border border-border hover:border-[#05b4ba]">→</a>
            )}
          </nav>
        )}
      </main>
      <Footer />
    </div>
  )
}
