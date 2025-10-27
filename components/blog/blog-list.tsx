"use client"

import type { Post } from "@/.contentlayer/generated"
import { motion } from "framer-motion"
import { BlogCard } from "./blog-card"
import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { useTranslations } from "next-intl"

interface BlogListProps {
  posts: Post[]
  locale: string
}

export function BlogList({ posts, locale }: BlogListProps) {
  const t = useTranslations("blog")
  const title = t("list.title")
  const subtitle = t("list.subtitle")
  const placeholder = t("search.placeholder")
  const emptyStateText = t("search.empty")

  const [query, setQuery] = useState("")
  const filteredPosts = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return posts
    return posts.filter((post) => {
      const haystack = [
        post.title,
        post.description,
        ...(post.tags || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [posts, query])

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

      <div className="max-w-2xl mx-auto mb-10">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="h-11 text-base"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredPosts.map((post, index) => (
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

      {filteredPosts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{emptyStateText}</p>
        </div>
      )}
    </div>
  )
}
