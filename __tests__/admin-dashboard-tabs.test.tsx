/** @jest-environment jsdom */

import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import "@testing-library/jest-dom"
import { AdminDashboardTabs, type AdminPostRow } from "@/components/admin/admin-dashboard-tabs"

jest.mock("@/components/admin/delete-post-button", () => ({
  DeletePostButton: ({ file }: { file: string }) => <button data-file={file}>Borrar</button>,
}))

jest.mock("@/components/admin/budget-webhook-form", () => ({
  BudgetWebhookForm: () => <div>BudgetWebhookForm</div>,
}))

const samplePosts: AdminPostRow[] = [
  {
    title: "Post ES",
    locale: "es",
    slug: "post-es",
    date: "2024-01-01",
    published: true,
    sourceFilePath: "content/post-es.mdx",
  },
  {
    title: "Post EN",
    locale: "en",
    slug: "post-en",
    date: "2024-02-01",
    published: true,
    sourceFilePath: "content/post-en.mdx",
  },
  {
    title: "Post IT",
    locale: "it",
    slug: "post-it",
    date: "2024-03-01",
    published: true,
    sourceFilePath: "content/post-it.mdx",
  },
]

const getTableBodyRows = () => {
  const tbody = document.querySelector("tbody")
  if (!tbody) throw new Error("tbody not found")
  return within(tbody as HTMLElement).queryAllByRole("row")
}

describe("AdminDashboardTabs", () => {
  it("renders tabs and cms table", () => {
    render(
      <AdminDashboardTabs
        posts={[
          {
            title: "Post 1",
            locale: "es",
            slug: "post-1",
            date: "2024-01-01",
            published: true,
            sourceFilePath: "content/posts/post-1.mdx",
          },
        ]}
      />,
    )

    expect(screen.getByRole("tab", { name: /CMS Blog/i })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /Presupuesto/i })).toBeInTheDocument()
    expect(screen.getByText(/Post 1/i)).toBeInTheDocument()
    expect(screen.getByText(/content\/posts\/post-1\.mdx/i)).toBeInTheDocument()
  })

  describe("locale filter", () => {
    it("renders all posts and 'Todos' active by default", () => {
      render(<AdminDashboardTabs posts={samplePosts} />)

      expect(screen.getByText("Post ES")).toBeInTheDocument()
      expect(screen.getByText("Post EN")).toBeInTheDocument()
      expect(screen.getByText("Post IT")).toBeInTheDocument()
      expect(getTableBodyRows()).toHaveLength(3)

      const todosBtn = screen.getByRole("button", { name: /^Todos$/i })
      expect(todosBtn).toHaveAttribute("aria-pressed", "true")
    })

    it("shows visible post count", () => {
      render(<AdminDashboardTabs posts={samplePosts} />)
      expect(screen.getByText(/3 posts/i)).toBeInTheDocument()
    })

    it("filters to a single locale on click", async () => {
      const user = userEvent.setup()
      render(<AdminDashboardTabs posts={samplePosts} />)

      await user.click(screen.getByRole("button", { name: /^ES$/ }))

      expect(screen.getByText("Post ES")).toBeInTheDocument()
      expect(screen.queryByText("Post EN")).not.toBeInTheDocument()
      expect(screen.queryByText("Post IT")).not.toBeInTheDocument()
      expect(screen.getByText(/1 post(?!s)/i)).toBeInTheDocument()
    })

    it("adds a locale on ctrl+click", async () => {
      const user = userEvent.setup()
      render(<AdminDashboardTabs posts={samplePosts} />)

      await user.click(screen.getByRole("button", { name: /^ES$/ }))
      await user.keyboard("{Control>}")
      await user.click(screen.getByRole("button", { name: /^EN$/ }))
      await user.keyboard("{/Control}")

      expect(screen.getByText("Post ES")).toBeInTheDocument()
      expect(screen.getByText("Post EN")).toBeInTheDocument()
      expect(screen.queryByText("Post IT")).not.toBeInTheDocument()
      expect(screen.getByText(/2 posts/i)).toBeInTheDocument()
    })

    it("resets to all posts when clicking 'Todos'", async () => {
      const user = userEvent.setup()
      render(<AdminDashboardTabs posts={samplePosts} />)

      await user.click(screen.getByRole("button", { name: /^ES$/ }))
      expect(getTableBodyRows()).toHaveLength(1)

      await user.click(screen.getByRole("button", { name: /^Todos$/i }))

      expect(getTableBodyRows()).toHaveLength(3)
      expect(screen.getByRole("button", { name: /^Todos$/i })).toHaveAttribute(
        "aria-pressed",
        "true",
      )
    })

    it("returns to 'Todos' when the last selected locale is toggled off", async () => {
      const user = userEvent.setup()
      render(<AdminDashboardTabs posts={samplePosts} />)

      await user.click(screen.getByRole("button", { name: /^ES$/ }))
      expect(getTableBodyRows()).toHaveLength(1)

      await user.keyboard("{Control>}")
      await user.click(screen.getByRole("button", { name: /^ES$/ }))
      await user.keyboard("{/Control}")

      expect(getTableBodyRows()).toHaveLength(3)
      expect(screen.getByRole("button", { name: /^Todos$/i })).toHaveAttribute(
        "aria-pressed",
        "true",
      )
    })
  })

  it("snapshots at 360px, 768px, 1024px", () => {
    const setViewport = (width: number) => {
      Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width })
      window.dispatchEvent(new Event("resize"))
    }

    setViewport(360)
    const snap360 = render(<AdminDashboardTabs posts={[]} />)
    expect(snap360.container).toMatchSnapshot()

    setViewport(768)
    const snap768 = render(<AdminDashboardTabs posts={[]} />)
    expect(snap768.container).toMatchSnapshot()

    setViewport(1024)
    const snap1024 = render(<AdminDashboardTabs posts={[]} />)
    expect(snap1024.container).toMatchSnapshot()
  })
})
