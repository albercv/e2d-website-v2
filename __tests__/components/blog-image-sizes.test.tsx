/** @jest-environment jsdom */
import { render } from "@testing-library/react"
import { BlogCard } from "@/components/blog/blog-card"

const post = {
  title: "T", description: "D", date: "2026-01-01", locale: "es", slug: "t",
  url: "/es/blog/t", cover: "/uploads/k/c.png", tags: [],
  readingTime: { minutes: 3 }, published: true, translationKey: "k",
} as never

it("blog card image declares responsive sizes", () => {
  const { container } = render(<BlogCard post={post} />)
  const img = container.querySelector("img")
  expect(img?.getAttribute("sizes")).toBe("(max-width: 768px) 100vw, 400px")
})
