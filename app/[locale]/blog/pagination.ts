export const POSTS_PER_PAGE = 12

export function paginatePosts<T>(posts: T[], pageParam: string | undefined) {
  const totalPages = Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE))
  const parsed = Number.parseInt(pageParam ?? "1", 10)
  const page = Number.isNaN(parsed) ? 1 : Math.min(Math.max(parsed, 1), totalPages)
  const start = (page - 1) * POSTS_PER_PAGE
  return { pagePosts: posts.slice(start, start + POSTS_PER_PAGE), totalPages, page }
}
