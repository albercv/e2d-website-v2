import { allPosts } from "@/.contentlayer/generated"
import { BlogList } from "@/components/blog/blog-list"
import { Navigation } from "@/components/layout/navigation"
import { Footer } from "@/components/layout/footer"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

interface BlogPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: BlogPageProps): Promise<Metadata> {
  const { locale } = await params

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

  return {
    title: titles[locale] ?? titles.es,
    description: descriptions[locale] ?? descriptions.es,
    alternates: {
      canonical: `${baseUrl}/${locale}/blog`,
      languages: {
        es: `${baseUrl}/es/blog`,
        en: `${baseUrl}/en/blog`,
        it: `${baseUrl}/it/blog`,
      },
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
      index: true,
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

export default async function BlogPage({ params }: BlogPageProps) {
  const { locale } = await params

  if (!["es", "en", "it"].includes(locale)) {
    notFound()
  }

  const posts = allPosts
    .filter((post) => post.locale === locale && post.published)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-16">
        <BlogList posts={posts} locale={locale} />
      </main>
      <Footer />
    </div>
  )
}
