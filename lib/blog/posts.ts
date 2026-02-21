import { allPosts } from "@/.contentlayer/generated"
import type { Post } from "@/.contentlayer/generated"

export type BlogLocale = "es" | "en" | "it"

export interface BlogSearchItem {
  id: string
  title: string
  url: string
  excerpt: string
  locale: BlogLocale
  tags: string[]
  author: string
  date: string
  slug: string
  wordCount: number
  readingTime: Post["readingTime"]
  relevanceScore: number
  contentSnippet?: string
}

export interface SearchPostsParams {
  query: string
  limit?: number
  locale?: BlogLocale
  includeSnippet?: boolean
}

export interface GetPostParams {
  id: string
  includeContent?: boolean
  locale?: BlogLocale
}

export interface BlogPostResult {
  id: string
  title: string
  url: string
  content?: string
  excerpt: string
  locale: BlogLocale
  tags: string[]
  author: string
  date: string
  slug: string
  wordCount: number
  readingTime: Post["readingTime"]
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || "https://evolve2digital.com"
}

function normalizeQueryWords(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1)
}

function calculateRelevanceScore(query: string, post: Post): number {
  const queryWords = normalizeQueryWords(query)
  if (queryWords.length === 0) return 0

  let score = 0

  const titleMatches = queryWords.filter((word) => post.title.toLowerCase().includes(word)).length
  score += (titleMatches / queryWords.length) * 3

  if (post.description) {
    const descMatches = queryWords.filter((word) => post.description!.toLowerCase().includes(word)).length
    score += (descMatches / queryWords.length) * 2
  }

  if (post.tags) {
    const tagMatches = queryWords.filter((word) => post.tags!.some((tag) => tag.toLowerCase().includes(word))).length
    score += (tagMatches / queryWords.length) * 2
  }

  if (post.body?.raw) {
    const contentMatches = queryWords.filter((word) => post.body.raw.toLowerCase().includes(word)).length
    score += (contentMatches / queryWords.length) * 1
  }

  return Math.min(score, 1)
}

function extractContentSnippet(content: string, query: string, maxLength: number = 200): string {
  const queryWords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2)

  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0)
  let bestSentence = sentences[0] || ""
  let maxMatches = 0

  for (const sentence of sentences) {
    const matches = queryWords.filter((word) => sentence.toLowerCase().includes(word)).length
    if (matches > maxMatches) {
      maxMatches = matches
      bestSentence = sentence
    }
  }

  const trimmed = bestSentence.trim()
  if (trimmed.length <= maxLength) return trimmed
  return trimmed.substring(0, maxLength - 3) + "..."
}

function getPublishedPosts(locale: BlogLocale): Post[] {
  return allPosts.filter((post) => post.locale === locale && post.published !== false)
}

export function searchPosts(params: SearchPostsParams): BlogSearchItem[] {
  const query = params.query?.trim() ?? ""
  const locale = params.locale ?? "es"
  const limit = Math.max(1, Math.min(params.limit ?? 5, 10))
  const includeSnippet = params.includeSnippet ?? true

  if (query.length < 2) return []

  const availablePosts = getPublishedPosts(locale)
  if (availablePosts.length === 0) return []

  const baseUrl = getBaseUrl()
  const scoredPosts = availablePosts
    .map((post) => ({ post, score: calculateRelevanceScore(query, post) }))
    .filter((item) => item.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return scoredPosts.map(({ post, score }) => {
    const url = `${baseUrl}/${post.locale}/blog/${post.slug}`
    const excerpt = post.description || ""
    const result: BlogSearchItem = {
      id: post.slug,
      title: post.title,
      url,
      excerpt,
      locale: post.locale as BlogLocale,
      tags: post.tags || [],
      author: post.author || "Alberto Carrasco",
      date: post.date,
      slug: post.slug,
      wordCount: post.wordCount || 0,
      readingTime: post.readingTime,
      relevanceScore: Math.round(score * 100) / 100,
    }

    if (includeSnippet && post.body?.raw) {
      result.contentSnippet = extractContentSnippet(post.body.raw, query)
    }

    return result
  })
}

export function getPost(params: GetPostParams): BlogPostResult | null {
  const id = params.id?.trim()
  const locale = params.locale ?? "es"
  if (!id) return null

  const posts = getPublishedPosts(locale)
  const normalized = id.toLowerCase()
  const post =
    posts.find((p) => p.slug.toLowerCase() === normalized) ||
    posts.find((p) => p.title.trim().toLowerCase() === normalized)
  if (!post) return null

  const baseUrl = getBaseUrl()
  const result: BlogPostResult = {
    id: post.slug,
    title: post.title,
    url: `${baseUrl}/${post.locale}/blog/${post.slug}`,
    excerpt: post.description || "",
    locale: post.locale as BlogLocale,
    tags: post.tags || [],
    author: post.author || "Alberto Carrasco",
    date: post.date,
    slug: post.slug,
    wordCount: post.wordCount || 0,
    readingTime: post.readingTime,
  }

  if (params.includeContent && post.body?.raw) {
    result.content = post.body.raw
  }

  return result
}
