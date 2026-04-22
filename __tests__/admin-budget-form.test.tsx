/** @jest-environment jsdom */

import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import "@testing-library/jest-dom"
import { BudgetWebhookForm } from "@/components/admin/budget-webhook-form"

describe("BudgetWebhookForm", () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    jest.clearAllMocks()
  })

  it("renders and snapshots at 360px, 768px, 1024px", () => {
    const setViewport = (width: number) => {
      Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width })
      window.dispatchEvent(new Event("resize"))
    }

    setViewport(360)
    const snap360 = render(<BudgetWebhookForm />)
    expect(snap360.container).toMatchSnapshot()

    setViewport(768)
    const snap768 = render(<BudgetWebhookForm />)
    expect(snap768.container).toMatchSnapshot()

    setViewport(1024)
    const snap1024 = render(<BudgetWebhookForm />)
    expect(snap1024.container).toMatchSnapshot()
  })

  it("submits payload and prints response", async () => {
    global.fetch = jest.fn(async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          timestamp: new Date().toISOString(),
          durationMs: 12,
          upstream: {
            url: "https://example.com",
            status: 200,
            ok: true,
            contentType: "application/json",
            data: { received: true },
          },
        }),
      } as any
    }) as any

    render(<BudgetWebhookForm />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/Nombre/i), "Nombre")
    await user.type(screen.getByLabelText(/Email/i), "test@example.com")
    await user.type(screen.getByLabelText(/Mensaje/i), "mensaje suficientemente largo")
    await user.click(screen.getByRole("button", { name: /Llamar webhook/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    const [url, init] = (global.fetch as any).mock.calls[0]
    expect(url).toBe("/api/auth/budget")
    expect(init.method).toBe("POST")
    expect(init.headers["Content-Type"]).toBe("application/json")
    expect(JSON.parse(init.body)).toMatchObject({
      name: "Nombre",
      email: "test@example.com",
      message: "mensaje suficientemente largo",
    })

    expect(await screen.findByText(/"upstream"/i)).toBeInTheDocument()
  })

  it("renders Texto tab when upstream data contains output", async () => {
    const output = "### Resumen del proyecto\nLinea 2"

    global.fetch = jest.fn(async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          timestamp: new Date().toISOString(),
          durationMs: 12,
          upstream: {
            url: "https://example.com",
            status: 200,
            ok: true,
            contentType: "application/json",
            data: [{ output }],
          },
        }),
      } as any
    }) as any

    render(<BudgetWebhookForm />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/Nombre/i), "Nombre")
    await user.type(screen.getByLabelText(/Email/i), "test@example.com")
    await user.type(screen.getByLabelText(/Mensaje/i), "mensaje suficientemente largo")
    await user.click(screen.getByRole("button", { name: /Llamar webhook/i }))

    const textoTab = await screen.findByRole("tab", { name: "Texto" })
    await user.click(textoTab)

    expect(await screen.findByText(/Resumen del proyecto/i)).toBeInTheDocument()
  })

  it("shows error when API returns non-ok", async () => {
    global.fetch = jest.fn(async () => {
      return {
        ok: false,
        status: 400,
        json: async () => ({ ok: false, error: "Parámetros inválidos" }),
      } as any
    }) as any

    render(<BudgetWebhookForm />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/Nombre/i), "Nombre")
    await user.type(screen.getByLabelText(/Email/i), "test@example.com")
    await user.type(screen.getByLabelText(/Mensaje/i), "mensaje suficientemente largo")
    await user.click(screen.getByRole("button", { name: /Llamar webhook/i }))

    expect(await screen.findByText(/Parámetros inválidos/i)).toBeInTheDocument()
  })
})
