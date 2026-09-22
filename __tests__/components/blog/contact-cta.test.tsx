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

  it("opens the contact modal with the lead form when the button is clicked", async () => {
    const user = userEvent.setup()
    renderWithIntl(<ContactCTA />)
    await user.click(screen.getByRole("button", { name: /contactar/i }))
    expect(await screen.findByRole("dialog")).toBeInTheDocument()
    expect(screen.getByTestId("lead-form")).toBeInTheDocument()
    // Sending the lead by WhatsApp is itself the form's submit action now
    // (no separate direct-links block below the form).
    expect(screen.getByRole("button", { name: /whatsapp/i })).toBeInTheDocument()
  })
})
