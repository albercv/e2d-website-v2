/** @jest-environment jsdom */

import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom"
import { AdminDashboardTabs } from "@/components/admin/admin-dashboard-tabs"

jest.mock("@/components/admin/delete-post-button", () => ({
  DeletePostButton: ({ file }: { file: string }) => <button data-file={file}>Borrar</button>,
}))

jest.mock("@/components/admin/budget-webhook-form", () => ({
  BudgetWebhookForm: () => <div>BudgetWebhookForm</div>,
}))

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
