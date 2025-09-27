"use client"

import type { Post } from "@/.contentlayer/generated"
import { motion } from "framer-motion"
import { BlogCard } from "./blog-card"

interface BlogListProps {
  posts: Post[]
  locale: string
}

export function BlogList({ posts, locale }: BlogListProps) {
  const title = locale === "es" ? "Blog" : "Blog"
  const subtitle =
    locale === "es"
      ? "Artículos sobre automatización, desarrollo web y tecnología para PYMEs"
      : "Articles about automation, web development and technology for SMEs"

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4 text-balance">{title}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">{subtitle}</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {posts.map((post, index) => (
          <motion.div
            key={post.slug}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
          >
            <BlogCard post={post} />
          </motion.div>
        ))}
      </div>

      {posts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {locale === "es" ? "No hay artículos disponibles." : "No articles available."}
          </p>
        </div>
      )}
    </div>
  )
}
