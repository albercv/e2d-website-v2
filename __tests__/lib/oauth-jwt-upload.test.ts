// __tests__/lib/oauth-jwt-upload.test.ts
import jwtLib from "jsonwebtoken"
import { signUploadToken, verifyUploadToken } from "@/lib/oauth-jwt"

describe("upload JWT", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = "test-secret-32-chars-minimum-1234567890"
  })

  it("signs and verifies a valid token", () => {
    const jwt = signUploadToken({ translationKey: "ferdy-2026" }, 60)
    const claims = verifyUploadToken(jwt)
    expect(claims).not.toBeNull()
    expect(claims!.translationKey).toBe("ferdy-2026")
    expect(claims!.purpose).toBe("media-upload")
  })

  it("rejects a token with the wrong purpose", () => {
    // Forjamos un JWT firmado con el mismo secreto pero con purpose distinto:
    // verifyUploadToken debe descartarlo aunque la firma sea válida.
    const wrongPurpose = jwtLib.sign(
      { purpose: "access", translationKey: "ferdy" },
      process.env.JWT_SECRET!,
      { algorithm: "HS256", expiresIn: 60 }
    )
    expect(verifyUploadToken(wrongPurpose)).toBeNull()
  })

  it("rejects an expired token", async () => {
    const jwt = signUploadToken({ translationKey: "ferdy" }, 1)
    await new Promise((r) => setTimeout(r, 1100))
    expect(verifyUploadToken(jwt)).toBeNull()
  })

  it("rejects a tampered token", () => {
    const jwt = signUploadToken({ translationKey: "ferdy" }, 60)
    const tampered = jwt.slice(0, -2) + (jwt.endsWith("AA") ? "BB" : "AA")
    expect(verifyUploadToken(tampered)).toBeNull()
  })
})
