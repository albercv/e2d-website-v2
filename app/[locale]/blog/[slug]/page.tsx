import { allPosts } from "@/.contentlayer/generated"
import { BlogPost } from "@/components/blog/blog-post"
import { Navigation } from "@/components/layout/navigation"
import { Footer } from "@/components/layout/footer"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

interface BlogPostPageProps {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateStaticParams() {
  return allPosts.map((post) => ({
    locale: post.locale,
    slug: post.slug,
  }))
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const post = allPosts.find((post) => post.locale === locale && post.slug === slug)

  if (!post) {
    return {}
  }

  const baseUrl = "https://evolve2digital.com"
  const ogLocale = locale === "es" ? "es_ES" : locale === "en" ? "en_US" : "it_IT"

  return {
    title: `${post.title} - E2D Blog`,
    description: post.description,
    authors: [{ name: post.author }],
    alternates: {
      canonical: `${baseUrl}/${locale}/blog/${slug}`,
      languages: {
        es: `${baseUrl}/es/blog/${slug}`,
        en: `${baseUrl}/en/blog/${slug}`,
        it: `${baseUrl}/it/blog/${slug}`,
      },
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
      locale: ogLocale,
      url: `${baseUrl}/${locale}/blog/${slug}`,
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
      description: post.description,
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
  const post = allPosts.find((post) => post.locale === locale && post.slug === slug)

  if (!post || !post.published) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-16">
        <BlogPost post={post} />
      </main>
      <Footer />
    </div>
  )
}
