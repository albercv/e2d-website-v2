import type { Inline } from "@/lib/legal/types"

/** The single contact address reused across every legal document. */
export const CONTACT_EMAIL = "hello@evolve2digital.com"

/** A `mailto:` link fragment for `RichText` arrays, visible text == the address. */
export function mailto(email: string = CONTACT_EMAIL): Inline {
  return { link: email, href: `mailto:${email}` }
}
