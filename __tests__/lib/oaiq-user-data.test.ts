/**
 * @jest-environment node
 */

import { createHash } from "node:crypto"
import { buildOaiqUser, hashIdentifier } from "@/lib/analytics/oaiq-user-data"

const sha = (v: string) => createHash("sha256").update(v).digest("hex")

describe("hashIdentifier", () => {
  it("returns a lowercase 64-char hex SHA-256", () => {
    expect(hashIdentifier("x")).toBe(sha("x"))
    expect(hashIdentifier("x")).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe("buildOaiqUser", () => {
  it("normalises the email (trim + lowercase) before hashing", () => {
    const user = buildOaiqUser({ email: "  Lead@Example.COM " })
    expect(user.emails_sha256).toEqual([sha("lead@example.com")])
  })

  it("keeps only digits of the phone before hashing", () => {
    const user = buildOaiqUser({ email: "a@b.c", phone: "+34 605-49.76 (39)" })
    expect(user.phone_numbers_sha256).toEqual([sha("34605497639")])
  })

  it("omits the phone key when the phone is empty or too short", () => {
    expect(buildOaiqUser({ email: "a@b.c", phone: "" })).not.toHaveProperty("phone_numbers_sha256")
    expect(buildOaiqUser({ email: "a@b.c", phone: "12" })).not.toHaveProperty("phone_numbers_sha256")
  })

  it("passes ip and user agent through when present", () => {
    const user = buildOaiqUser({ email: "a@b.c", ipAddress: "81.45.1.1", userAgent: "UA/1" })
    expect(user.ip_address).toBe("81.45.1.1")
    expect(user.user_agent).toBe("UA/1")
  })

  it("omits ip and user agent keys when absent", () => {
    const user = buildOaiqUser({ email: "a@b.c" })
    expect(user).toEqual({ emails_sha256: [sha("a@b.c")] })
  })
})
