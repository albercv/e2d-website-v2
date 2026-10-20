import type { LegalDocument } from "@/lib/legal/types"
import { mailto } from "../shared"

// English translation. Section ids/order/block shapes mirror es.ts exactly —
// see __tests__/lib/legal-content-parity.test.ts. Title matches the existing
// metadata title in app/[locale]/cookies/page.tsx ("Cookies Policy").
export const cookiesEn: LegalDocument = {
  title: "Cookies Policy",
  lastUpdatedLabel: "Last updated",
  lastUpdated: "26 September 2025",
  notice: "This is a translation provided for convenience. In case of discrepancy, the Spanish version prevails.",
  sections: [
    {
      id: "what-are-cookies",
      title: "What are cookies?",
      blocks: [
        {
          kind: "paragraph",
          text: "Cookies are small text files that are stored on your device when you visit a website. They help us improve your browsing experience, remember your preferences and analyze how you use our website.",
        },
      ],
    },
    {
      id: "cookie-types",
      title: "Types of cookies we use",
      blocks: [
        {
          kind: "cards",
          items: [
            {
              title: "Essential cookies",
              text: "These cookies are necessary for the basic operation of the website and cannot be disabled. They include session cookies, language preferences and security settings.",
            },
            {
              title: "Analytics cookies",
              text: "We use analytics cookies to understand how visitors interact with our website. This helps us improve the site's functionality and content.",
            },
            {
              title: "Functionality cookies",
              text: "These cookies allow the website to remember choices you make (such as your username, language or region) and provide enhanced, more personal features.",
            },
          ],
        },
      ],
    },
    {
      id: "cookie-management",
      title: "Managing cookies",
      blocks: [
        {
          kind: "paragraph",
          text: "You can control and/or delete cookies as you wish. You can delete all cookies already on your computer and you can set most browsers to prevent them from being placed.",
        },
        { kind: "paragraph", text: "To manage cookies in the most popular browsers:" },
        {
          kind: "list",
          items: [
            { label: "Chrome:", text: "Settings → Privacy and security → Cookies" },
            { label: "Firefox:", text: "Settings → Privacy & Security → Cookies" },
            { label: "Safari:", text: "Preferences → Privacy → Cookies" },
            { label: "Edge:", text: "Settings → Privacy, search, and services → Cookies" },
          ],
        },
      ],
    },
    {
      id: "third-party-cookies",
      title: "Third-party cookies",
      blocks: [
        {
          kind: "paragraph",
          text: "Some of our partners may place cookies on your device when you visit our site. These cookies are subject to the privacy policies of those third parties.",
        },
      ],
    },
    {
      id: "policy-updates",
      title: "Updates to this policy",
      blocks: [
        {
          kind: "paragraph",
          text: "We may update this cookie policy from time to time. We recommend that you review this page periodically to stay informed of any changes.",
        },
      ],
    },
    {
      id: "contact",
      title: "Contact",
      blocks: [
        { kind: "paragraph", text: "If you have any questions about our cookie policy, you can contact us:" },
        {
          kind: "infoBox",
          rows: [
            { label: "Email", value: [mailto()] },
            { label: "Controller", value: "Alberto Carrasco" },
            { label: "Company", value: "E2D - Evolve2Digital" },
          ],
        },
      ],
    },
  ],
}
