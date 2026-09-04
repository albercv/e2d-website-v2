import { SUPPORT_EMAIL, getMailHref } from "@/lib/contact/email"

describe("getMailHref", () => {
  it("builds a mailto with encoded subject", () => {
    expect(getMailHref("Consulta web")).toBe(`mailto:${SUPPORT_EMAIL}?subject=Consulta%20web`)
  })
  it("appends an encoded body when given", () => {
    expect(getMailHref("S", "Hola\nAna")).toBe(`mailto:${SUPPORT_EMAIL}?subject=S&body=Hola%0AAna`)
  })
})
