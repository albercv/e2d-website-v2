import { buildFormMessage } from "@/lib/leads/lead-form-message"
import type { SubmittedLead } from "@/lib/leads/lead-form-model"

// Echoes the key back (with intentOptions.<x> kept literal) so assertions
// can check structure without a real translation catalogue.
const t = (key: string): string => key

const lead: SubmittedLead = {
  leadId: "L1", name: "Ana", email: "ana@example.com", phone: "600111222",
  company: "ACME", intent: "chatbot", message: "hola",
}

describe("buildFormMessage", () => {
  it("renders the intro followed by one 'label: value' line per filled field", () => {
    const message = buildFormMessage(lead, t)
    const lines = message.split("\n")
    expect(lines[0]).toBe("followUpIntro")
    expect(lines[1]).toBe("")
    expect(lines.slice(2)).toEqual([
      "name: Ana",
      "company: ACME",
      "email: ana@example.com",
      "phone: 600111222",
      "labelIntent: intentOptions.chatbot",
      "labelMessage: hola",
    ])
  })

  it("omits empty optional fields", () => {
    const message = buildFormMessage({ ...lead, phone: "", company: "", intent: "", message: "" }, t)
    expect(message).toContain("name: Ana")
    expect(message).not.toMatch(/phone|company|labelIntent|labelMessage/)
  })
})
