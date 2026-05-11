import { listPostsFromDisk, getCompiledPost, resolvePostCovers, type RuntimeLocale } from "@/lib/blog/posts-runtime"
import { buildBlogAlternates, toAbsoluteAlternates } from "@/lib/blog/alternates"
import { BlogPost } from "@/components/blog/blog-post"
import { Navigation } from "@/components/layout/navigation"
import { Footer } from "@/components/layout/footer"
import { LocaleAlternatesProvider } from "@/components/layout/locale-alternates-context"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"

const BASE_URL = "https://evolve2digital.com"

interface BlogPostPageProps {
  params: Promise<{ locale: string; slug: string }>
}

function isLocale(value: string): value is RuntimeLocale {
  return value === "es" || value === "en" || value === "it"
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { locale, slug } = await params
  if (!isLocale(locale)) return {}
  const all = await listPostsFromDisk()
  const raw = all.find((p) => p.locale === locale && p.slug === slug)

  if (!raw) {
    return {}
  }

  const [post] = await resolvePostCovers([raw])
  const alternates = await buildBlogAlternates(raw.translationKey)
  const absoluteAlternates = toAbsoluteAlternates(alternates, BASE_URL)
  const esFallback = absoluteAlternates["es"] ?? Object.values(absoluteAlternates)[0]
  if (esFallback) absoluteAlternates["x-default"] = esFallback

  const ogLocale = locale === "es" ? "es_ES" : locale === "en" ? "en_US" : "it_IT"
  const author = post.author || "Alberto Carrasco"
  const description = post.description || ""
  const canonical = `${BASE_URL}/${locale}/blog/${slug}`

  return {
    title: `${post.title} - E2D Blog`,
    description,
    authors: [{ name: author }],
    alternates: {
      canonical,
      languages: absoluteAlternates,
    },
    openGraph: {
      title: post.title,
      description,
      type: "article",
      publishedTime: post.date,
      authors: [author],
      locale: ogLocale,
      url: canonical,
      images: [
        {
          url: post.cover || "/placeholder.jpg",
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: [post.cover || "/placeholder.jpg"],
    },
    robots: {
      index: true,
      follow: true,
    },
    keywords: post.tags ?? undefined,
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { locale, slug } = await params
  if (!isLocale(locale)) notFound()
  const post = await getCompiledPost(slug, locale)
  if (!post) notFound()

  const alternates = await buildBlogAlternates(post.translationKey)

  return (
    <LocaleAlternatesProvider alternates={alternates}>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="pt-16">
          <BlogPost post={post} />
        </main>
        <Footer />
      </div>
    </LocaleAlternatesProvider>
  )
}
