import { listPostsFromDisk } from "@/lib/blog/posts-runtime"
import { AdminDashboardTabs } from "@/components/admin/admin-dashboard-tabs"

export const dynamic = "force-dynamic"

export default async function AdminDashboardPage() {
  const all = await listPostsFromDisk()
  const posts = all
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const rows = posts.map((post) => ({
    title: post.title,
    locale: post.locale,
    slug: post.slug,
    date: post.date,
    published: post.published,
    sourceFilePath: post._raw.sourceFilePath,
  }))

  return <AdminDashboardTabs posts={rows} />
}
