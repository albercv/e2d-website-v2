// lib/blog/translation-key.ts
import { listPostsFromDisk, type RuntimePost, type RuntimeLocale } from "./posts-runtime"

export async function findPostsByTranslationKey(key: string): Promise<RuntimePost[]> {
  const all = await listPostsFromDisk()
  return all.filter((p) => p.translationKey === key)
}

export async function getTranslationKeyForSlug(
  slug: string,
  locale: RuntimeLocale
): Promise<string | null> {
  const all = await listPostsFromDisk()
  const post = all.find((p) => p.slug === slug && p.locale === locale)
  return post ? post.translationKey : null
}
