"use client"

import type { RuntimePost as Post } from "@/lib/blog/posts-runtime"
import { motion } from "framer-motion"
import { BlogCard } from "./blog-card"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { useTranslations } from "next-intl"
import { buildBlogListUrl } from "@/app/[locale]/blog/pagination"

interface BlogListProps {
  posts: Post[]
  locale: string
  query?: string
}

const SEARCH_DEBOUNCE_MS = 350

// La búsqueda se resuelve en servidor (?q=) sobre todos los posts del locale;
// aquí solo navegamos. Enter envía el form; escribir navega con debounce.
function useServerSearch(locale: string, initial: string) {
  const router = useRouter()
  const [value, setValue] = useState(initial)
  const applied = useRef(initial)

  useEffect(() => {
    if (value === applied.current) return
    const id = setTimeout(() => {
      applied.current = value
      router.replace(buildBlogListUrl(locale, { q: value.trim() }), { scroll: false })
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [value, locale, router])

  return { value, setValue }
}

export function BlogList({ posts, locale, query = "" }: BlogListProps) {
  const t = useTranslations("blog")
  const title = t("list.title")
  const subtitle = t("list.subtitle")
  const placeholder = t("search.placeholder")
  const emptyStateText = t("search.empty")

  const { value, setValue } = useServerSearch(locale, query)

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

      <form action={`/${locale}/blog`} method="get" role="search" className="max-w-2xl mx-auto mb-10">
        <Input
          type="search"
          name="q"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-11 text-base"
        />
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 auto-rows-fr">
        {posts.map((post, index) => (
          <motion.div
            key={post.slug}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className="h-full"
          >
            <BlogCard post={post} />
          </motion.div>
        ))}
      </div>

      {posts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{emptyStateText}</p>
        </div>
      )}
    </div>
  )
}
