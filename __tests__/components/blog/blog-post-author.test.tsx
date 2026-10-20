/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react"
import type { CompiledPost } from "@/lib/blog/posts-runtime"

// The MDX body and the schema scripts are irrelevant here; the test only looks
// at how the visible author name is rendered.
jest.mock("next-mdx-remote", () => ({ MDXRemote: () => null }))
jest.mock("@/components/blog/mdx-components", () => ({ MDXComponents: {} }))
jest.mock("@/components/seo/json-ld", () => ({
  BlogPostSchema: () => null,
  BreadcrumbSchema: () => null,
}))

import { BlogPost } from "@/components/blog/blog-post"

function makePost(author: string | undefined, locale = "es"): CompiledPost {
  return {
    title: "Título",
    description: "Descripción",
    date: "2026-05-01",
    locale,
    slug: "titulo",
    url: `/${locale}/blog/titulo`,
    author,
    tags: [],
    readingTime: { minutes: 3 },
    compiled: {},
  } as unknown as CompiledPost
}

describe("BlogPost visible author", () => {
  it.each(["es", "en", "it"])("links Alberto Carrasco to the profile page (%s post)", (locale) => {
    render(<BlogPost post={makePost("Alberto Carrasco", locale)} />)
    const link = screen.getByRole("link", { name: "Alberto Carrasco" })
    expect(link).toHaveAttribute("href", "/es/alberto-carrasco")
    expect(link).toHaveAttribute("hrefLang", "es")
    expect(link).toHaveAttribute("rel", "author")
  })

  it("does not link a guest author to Alberto's profile", () => {
    render(<BlogPost post={makePost("Otra Persona")} />)
    expect(screen.getByText("Otra Persona")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Otra Persona" })).toBeNull()
    expect(document.querySelector('a[href="/es/alberto-carrasco"]')).toBeNull()
  })
})
