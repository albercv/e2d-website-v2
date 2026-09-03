/**
 * @jest-environment node
 */

import { buildConsultationEmail } from "@/lib/email/consultation-email"

describe("buildConsultationEmail without sessionId", () => {
  it("omits the session line in html and text", () => {
    const email = buildConsultationEmail({
      lead: { email: "a@b.c" },
      conversation: [],
      locale: "es",
    })
    expect(email.html).not.toMatch(/sesi[oó]n|session/i)
    expect(email.text).not.toMatch(/sesi[oó]n|session/i)
  })

  it("keeps the session line when a sessionId is given", () => {
    const email = buildConsultationEmail({
      lead: { email: "a@b.c" },
      conversation: [],
      locale: "es",
      sessionId: "11111111-1111-4111-8111-111111111111",
    })
    expect(email.text).toContain("11111111-1111-4111-8111-111111111111")
  })
})
