/**
 * @jest-environment node
 */

const insertReturning = jest.fn()
const insertValues = jest.fn<{ returning: jest.Mock }, [Record<string, unknown>]>(() => ({ returning: insertReturning }))
const selectMock = jest.fn()

jest.mock("@/lib/db/client", () => ({
  db: {
    // Lazy references: jest.mock factories are hoisted above these consts.
    insert: () => ({ values: insertValues }),
    select: (...args: unknown[]) => selectMock(...args),
  },
}))
jest.mock("@/lib/email/resend-client", () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }))
jest.mock("@/lib/email/consultation-email", () => ({
  buildConsultationEmail: jest.fn(() => ({ subject: "s", html: "<p/>", text: "t" })),
}))

import { captureLead } from "@/lib/leads/lead-service"
import { buildConsultationEmail } from "@/lib/email/consultation-email"

describe("captureLead without a chat session (contact modal)", () => {
  beforeEach(() => {
    insertReturning.mockReset().mockResolvedValue([{ id: "lead-x" }])
    insertValues.mockClear()
    selectMock.mockReset()
    ;(buildConsultationEmail as jest.Mock).mockClear()
  })

  it("persists the lead with a null session and skips the transcript lookup", async () => {
    const result = await captureLead({ email: "a@b.c", consent: true, locale: "es" })
    expect(result.leadId).toBe("lead-x")
    expect(result.emailSent).toBe(true)
    // apollo enqueue is the second insert; the first is the lead row
    expect(insertValues.mock.calls[0][0]).toMatchObject({ sessionId: null, email: "a@b.c" })
    expect(selectMock).not.toHaveBeenCalled()
    expect(buildConsultationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ conversation: [], sessionId: undefined }),
    )
  })
})
