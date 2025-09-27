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

  return {
    title: locale === "es" ? "Blog - E2D | Automatización y Tecnología" : "Blog - E2D | Automation and Technology",
    description:
      locale === "es"
        ? "Artículos sobre automatización, chatbots, desarrollo web y tecnología para PYMEs"
        : "Articles about automation, chatbots, web development and technology for SMEs",
    alternates: {
      canonical: `/${locale}/blog`,
      languages: {
        es: "/es/blog",
        en: "/en/blog",
      },
    },
  }
}

export default async function BlogPage({ params }: BlogPageProps) {
  const { locale } = await params

  if (!["es", "en"].includes(locale)) {
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
