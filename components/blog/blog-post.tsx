"use client"

import type { Post } from "@/.contentlayer/generated"
import { useMDXComponent } from "next-contentlayer2/hooks"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, ArrowLeft } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { MDXComponents } from "./mdx-components"
import { BlogPostSchema, BreadcrumbSchema } from "@/components/seo/json-ld"
import { useTranslations } from "next-intl"

interface BlogPostProps {
  post: Post
}

export function BlogPost({ post }: BlogPostProps) {
  const MDXContent = useMDXComponent(post.body.code)
  const t = useTranslations("blog")

  const breadcrumbItems = [
    { name: t("breadcrumb.home"), url: `/${post.locale}` },
    { name: t("breadcrumb.blog"), url: `/${post.locale}/blog` },
    { name: post.title, url: `/${post.locale}/blog/${post.slug}` },
  ]

  return (
    <>
      <BlogPostSchema
        title={post.title}
        description={post.description}
        author={post.author}
        datePublished={post.date}
        url={`https://evolve2digital.com${post.url}`}
        image={post.cover}
        locale={post.locale}
      />
      <BreadcrumbSchema items={breadcrumbItems} />

      <article className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex items-center space-x-2 text-sm text-muted-foreground">
            {breadcrumbItems.map((item, index) => (
              <li key={item.url} className="flex items-center">
                {index > 0 && <span className="mx-2">/</span>}
                {index === breadcrumbItems.length - 1 ? (
                  <span className="text-foreground font-medium">{item.name}</span>
                ) : (
                  <a href={item.url} className="hover:text-foreground transition-colors">
                    {item.name}
                  </a>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="mb-8">
            <Link href={`/${post.locale}/blog`}>
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground mb-6">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("back")}
              </Button>
            </Link>

            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(post.date).toLocaleDateString(post.locale === "es" ? "es-ES" : "en-US")}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {post.readingTime.minutes} min
              </div>
              <span>•</span>
              <span>{post.author}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4 text-balance">{post.title}</h1>

            <p className="text-xl text-muted-foreground mb-6 text-pretty">{post.description}</p>

            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="bg-muted text-muted-foreground">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {post.cover && (
              <div className="aspect-video overflow-hidden rounded-lg mb-8">
                <Image
                  src={post.cover || "/placeholder.svg"}
                  alt={post.title}
                  width={800}
                  height={450}
                  className="w-full h-full object-cover"
                  unoptimized={post.cover.includes(".svg")}
                />
              </div>
            )}
          </div>

          <div className="prose prose-lg prose-invert max-w-none">
            <MDXContent components={MDXComponents} />
          </div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-12 p-8 bg-muted/30 rounded-lg text-center"
          >
            <h3 className="text-2xl font-bold text-foreground mb-4">
              {t("cta.title")}
            </h3>
            <p className="text-muted-foreground mb-6">
              {t("cta.subtitle")}
            </p>
            <Button className="bg-[#05b4ba] hover:bg-[#05b4ba]/90 text-white">
              {t("cta.button")}
            </Button>
          </motion.div>
        </motion.div>
      </article>
    </>
  )
}
