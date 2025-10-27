import type { Post } from "@/.contentlayer/generated"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface BlogCardProps {
  post: Post
}

export function BlogCard({ post }: BlogCardProps) {
  return (
    <Link href={post.url} className="block group">
      <Card className="h-full bg-card border-border hover:border-[#05b4ba]/50 transition-colors">
        {post.cover && (
          <div className="aspect-video overflow-hidden rounded-t-lg">
            <Image
              src={post.cover || "/placeholder.svg"}
              alt={post.title}
              width={400}
              height={225}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              unoptimized={post.cover.includes(".svg")}
            />
          </div>
        )}

        <CardHeader>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(post.date).toLocaleDateString(post.locale === "es" ? "es-ES" : "en-US")}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {post.readingTime.minutes} min
            </div>
          </div>

          <CardTitle className="text-xl font-semibold text-foreground group-hover:text-[#05b4ba] transition-colors line-clamp-2">
            {post.title}
          </CardTitle>
        </CardHeader>

        <CardContent>
          <CardDescription className="text-muted-foreground mb-4 line-clamp-3">{post.description}</CardDescription>

          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="bg-muted text-muted-foreground">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
