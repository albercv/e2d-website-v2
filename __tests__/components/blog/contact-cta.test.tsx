import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NextIntlClientProvider } from "next-intl"
import { ContactCTA } from "@/components/blog/ContactCTA"

const messages = { navigation: { contact: "Contacto" } }

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  )
}

describe("ContactCTA", () => {
  it("renders the trigger button", () => {
    renderWithIntl(<ContactCTA />)
    expect(screen.getByRole("button", { name: /contactar/i })).toBeInTheDocument()
  })

  it("opens the contact modal when the button is clicked", async () => {
    const user = userEvent.setup()
    renderWithIntl(<ContactCTA />)
    await user.click(screen.getByRole("button", { name: /contactar/i }))
    expect(await screen.findByRole("dialog")).toBeInTheDocument()
    expect(screen.getByText(/whatsapp/i)).toBeInTheDocument()
    expect(screen.getByText(/hello@evolve2digital\.com/i)).toBeInTheDocument()
  })
})
