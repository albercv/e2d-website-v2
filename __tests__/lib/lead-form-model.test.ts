/** @jest-environment jsdom */

import {
  buildLeadPayload,
  emptyLeadFormState,
  hasMarketingConsent,
  postLead,
  validateLeadForm,
  type LeadFormState,
} from "@/lib/leads/lead-form-model"

const filled: LeadFormState = {
  name: " Ana ", email: " Ana@Example.com ", phone: " 600 ", company: " ACME ",
  intent: "web", message: " hola ", consent: true,
}

describe("emptyLeadFormState", () => {
  it("only prefills a known intent", () => {
    expect(emptyLeadFormState("crm").intent).toBe("crm")
    expect(emptyLeadFormState("bogus").intent).toBe("")
    expect(emptyLeadFormState().consent).toBe(false)
  })
})

describe("validateLeadForm", () => {
  it("flags a missing or malformed email first", () => {
    expect(validateLeadForm({ ...filled, email: "" })).toBe("email")
    expect(validateLeadForm({ ...filled, email: "nope" })).toBe("email")
  })
  it("flags missing consent", () => {
    expect(validateLeadForm({ ...filled, consent: false })).toBe("consent")
  })
  it("returns null when valid", () => {
    expect(validateLeadForm(filled)).toBeNull()
  })
})

describe("hasMarketingConsent", () => {
  afterEach(() => localStorage.clear())
  it("is true only for an explicit marketing opt-in", () => {
    expect(hasMarketingConsent()).toBe(false)
    localStorage.setItem("cookie-consent", JSON.stringify({ marketing: false }))
    expect(hasMarketingConsent()).toBe(false)
    localStorage.setItem("cookie-consent", JSON.stringify({ marketing: true }))
    expect(hasMarketingConsent()).toBe(true)
    localStorage.setItem("cookie-consent", "{broken")
    expect(hasMarketingConsent()).toBe(false)
  })
})

describe("buildLeadPayload", () => {
  it("trims, lowercases the email and drops empty optionals", () => {
    const p = buildLeadPayload({ ...filled, phone: "  ", message: "" }, { locale: "es" })
    expect(p).toMatchObject({ name: "Ana", email: "ana@example.com", company: "ACME", intent: "web", consent: true, locale: "es" })
    expect(p).not.toHaveProperty("phone")
    expect(p).not.toHaveProperty("message")
    expect(p).not.toHaveProperty("sessionId")
  })
  it("includes sessionId when given and the analytics context", () => {
    localStorage.setItem("cookie-consent", JSON.stringify({ marketing: true }))
    const p = buildLeadPayload(filled, { locale: "en", sessionId: "sid" })
    expect(p.sessionId).toBe("sid")
    expect(p.sourceUrl).toBe(window.location.href)
    expect(p.marketingConsent).toBe(true)
    localStorage.clear()
  })
})

describe("postLead", () => {
  afterEach(() => jest.restoreAllMocks())
  it("returns the leadId on success", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, leadId: "L1" }) }) as unknown as typeof fetch
    await expect(postLead({ email: "a@b.c" })).resolves.toEqual({ ok: true, leadId: "L1" })
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe("/api/chat/lead")
  })
  it("returns ok:false on HTTP failure and on network error", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({}) }) as unknown as typeof fetch
    await expect(postLead({})).resolves.toEqual({ ok: false })
    jest.spyOn(console, "error").mockImplementation(() => undefined)
    global.fetch = jest.fn().mockRejectedValue(new TypeError("down")) as unknown as typeof fetch
    await expect(postLead({})).resolves.toEqual({ ok: false })
  })
})
