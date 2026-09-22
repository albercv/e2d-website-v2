/** @jest-environment jsdom */

import { setOaiqUser, splitName } from "@/lib/analytics/oaiq-user"

const ORIGINAL_PIXEL_ID = process.env.NEXT_PUBLIC_OAIQ_PIXEL_ID

function setPixelId(value: string | undefined): void {
  if (value === undefined) delete process.env.NEXT_PUBLIC_OAIQ_PIXEL_ID
  else process.env.NEXT_PUBLIC_OAIQ_PIXEL_ID = value
}

function installOaiq(): jest.Mock {
  const oaiq = jest.fn()
  ;(window as unknown as { oaiq: unknown }).oaiq = oaiq
  return oaiq
}

describe("setOaiqUser", () => {
  afterEach(() => {
    setPixelId(ORIGINAL_PIXEL_ID)
    delete (window as unknown as { oaiq?: unknown }).oaiq
  })

  it("does nothing when window.oaiq is not a function", () => {
    setPixelId("px_1")
    expect(() => setOaiqUser({ email: "a@b.c" })).not.toThrow()
  })

  it("does nothing when the pixel id env var is empty", () => {
    setPixelId("")
    const oaiq = installOaiq()
    setOaiqUser({ email: "a@b.c" })
    expect(oaiq).not.toHaveBeenCalled()
  })

  it("does nothing when no field is present", () => {
    setPixelId("px_1")
    const oaiq = installOaiq()
    setOaiqUser({})
    expect(oaiq).not.toHaveBeenCalled()
  })

  it("maps only the present, non-empty fields to the SDK keys", () => {
    setPixelId("px_1")
    const oaiq = installOaiq()
    setOaiqUser({ email: "a@b.c", externalId: "L1", firstName: "Ana" })
    expect(oaiq).toHaveBeenCalledWith("init", {
      pixelId: "px_1",
      user: { email_sha256: "a@b.c", external_id_sha256: "L1", first_name_sha256: "Ana" },
    })
  })

  it("maps every field when all are present", () => {
    setPixelId("px_1")
    const oaiq = installOaiq()
    setOaiqUser({
      email: "a@b.c", phone: "34605497639", externalId: "L1", firstName: "Ana", lastName: "López",
    })
    expect(oaiq).toHaveBeenCalledWith("init", {
      pixelId: "px_1",
      user: {
        email_sha256: "a@b.c",
        phone_number_sha256: "34605497639",
        external_id_sha256: "L1",
        first_name_sha256: "Ana",
        last_name_sha256: "López",
      },
    })
  })
})

describe("splitName", () => {
  it("keeps a single-token name as the first name only", () => {
    expect(splitName("Ana")).toEqual({ firstName: "Ana" })
  })

  it("splits a multi-token name at the first whitespace", () => {
    expect(splitName("Ana María López")).toEqual({ firstName: "Ana", lastName: "María López" })
  })

  it("returns nothing for an empty name", () => {
    expect(splitName("")).toEqual({})
  })

  it("trims surrounding whitespace", () => {
    expect(splitName("  Ana  ")).toEqual({ firstName: "Ana" })
  })
})
