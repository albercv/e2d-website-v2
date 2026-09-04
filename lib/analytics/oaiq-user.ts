// Tells the OpenAI pixel who the current visitor is, right after a lead is
// captured and before the generate_lead conversion fires. The pixel SDK
// exposes this through a re-callable "init" command; values may be raw
// strings (the SDK normalises and hashes them) or already-hashed hex.
// external_id is never captured automatically by the SDK, so the caller
// must supply it explicitly (we use the lead id).
//
// Window.oaiq is declared in components/analytics/openai-pixel.tsx — that
// global augmentation is visible here without an import.

export { splitName } from "./name-split"

export interface OaiqUserFields {
  email?: string
  phone?: string
  externalId?: string
  firstName?: string
  lastName?: string
}

// Maps our field names to the SDK's expected keys.
const FIELD_TO_SDK_KEY: Record<keyof OaiqUserFields, string> = {
  email: "email_sha256",
  phone: "phone_number_sha256",
  externalId: "external_id_sha256",
  firstName: "first_name_sha256",
  lastName: "last_name_sha256",
}

export function setOaiqUser(user: OaiqUserFields): void {
  if (typeof window === "undefined") return
  if (typeof window.oaiq !== "function") return
  const pixelId = process.env.NEXT_PUBLIC_OAIQ_PIXEL_ID
  if (!pixelId) return

  const mapped: Record<string, string> = {}
  for (const key of Object.keys(FIELD_TO_SDK_KEY) as (keyof OaiqUserFields)[]) {
    const value = user[key]
    if (value) mapped[FIELD_TO_SDK_KEY[key]] = value
  }
  if (Object.keys(mapped).length === 0) return

  window.oaiq("init", { pixelId, user: mapped })
}
