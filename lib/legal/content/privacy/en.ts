import type { LegalDocument } from "@/lib/legal/types"
import { mailto } from "../shared"

// English translation. Section ids/order/block shapes mirror es.ts exactly —
// see __tests__/lib/legal-content-parity.test.ts. The "ai-chat" description
// and every section title are reused verbatim from messages/en.json
// (namespace "privacy") per the translation brief.
export const privacyEn: LegalDocument = {
  title: "Privacy Policy",
  lastUpdatedLabel: "Last updated",
  lastUpdated: "28 September 2026",
  notice: "This is a translation provided for convenience. In case of discrepancy, the Spanish version prevails.",
  sections: [
    {
      id: "introduction",
      title: "Introduction",
      blocks: [
        {
          kind: "paragraph",
          text: "At E2D (Evolve2Digital), we respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use and protect your information when you use our services.",
        },
        {
          kind: "lines",
          lines: [
            [{ strong: "Controller:" }],
            "Alberto Carrasco",
            "E2D - Evolve2Digital",
            ["Email: ", mailto()],
            "Phone: 605497639",
          ],
        },
      ],
    },
    {
      id: "data-collection",
      title: "Data Collection",
      blocks: [
        { kind: "paragraph", text: "We collect the following types of information:" },
        {
          kind: "list",
          items: [
            { label: "Contact information:", text: "Name, email, phone number when you contact us" },
            { label: "Technical information:", text: "IP address, browser type, pages visited" },
            { label: "Cookies and similar technologies:", text: "To improve the user experience" },
            { label: "Communication information:", text: "Messages sent through the AI chat" },
          ],
        },
      ],
    },
    {
      id: "data-usage",
      title: "Data Usage",
      blocks: [
        { kind: "paragraph", text: "We use your data to:" },
        {
          kind: "list",
          items: [
            { text: "Provide and improve our services" },
            { text: "Respond to your queries and requests" },
            { text: "Send relevant information about our services" },
            { text: "Comply with legal obligations" },
            { text: "Analyze website usage for improvements" },
          ],
        },
      ],
    },
    {
      id: "legal-basis",
      title: "Legal Basis",
      blocks: [
        { kind: "paragraph", text: "The processing of your data is based on:" },
        {
          kind: "list",
          items: [
            { label: "Consent:", text: "For non-essential cookies and marketing" },
            { label: "Legitimate interest:", text: "For analysis and service improvement" },
            { label: "Contract performance:", text: "To provide requested services" },
            { label: "Legal compliance:", text: "For tax and legal obligations" },
          ],
        },
      ],
    },
    {
      id: "cookies",
      title: "Cookie Policy",
      blocks: [
        { kind: "paragraph", text: "We use different types of cookies:" },
        {
          kind: "cards",
          items: [
            { title: "Necessary Cookies", text: "Essential for the website to function. They cannot be disabled." },
            {
              title: "Analytics Cookies",
              text: "Help us understand how visitors interact with the website.",
            },
            {
              title: "Marketing Cookies",
              text: "Used to display relevant ads and measure campaign effectiveness.",
            },
          ],
        },
      ],
    },
    {
      id: "rights",
      title: "Your Rights",
      blocks: [
        { kind: "paragraph", text: "Under the GDPR, you have the following rights:" },
        {
          kind: "list",
          items: [
            { label: "Right of access:", text: "Request information about your data" },
            { label: "Right to rectification:", text: "Correct inaccurate data" },
            { label: "Right to erasure:", text: "Request deletion of your data" },
            { label: "Right to portability:", text: "Receive your data in a structured format" },
            { label: "Right to object:", text: "Object to the processing of your data" },
            { label: "Right to restriction:", text: "Restrict the processing" },
          ],
        },
        { kind: "paragraph", text: ["To exercise these rights, contact us at: ", mailto()] },
      ],
    },
    {
      id: "security",
      title: "Security",
      blocks: [
        {
          kind: "paragraph",
          text: "We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure or destruction. This includes encryption, access controls and regular security audits.",
        },
      ],
    },
    {
      id: "contact",
      title: "Contact",
      blocks: [
        {
          kind: "paragraph",
          text: "If you have questions about this privacy policy or the processing of your data, you can contact us at:",
        },
        {
          kind: "infoBox",
          rows: [
            { label: "Email", value: [mailto()] },
            { label: "Phone", value: "605497639" },
            { label: "Address", value: "Madrid, Spain" },
          ],
        },
      ],
    },
    {
      id: "ai-chat",
      title: "AI Assistant",
      blocks: [
        {
          kind: "paragraph",
          text: "If you interact with the AI assistant, your messages are sent to DeepSeek (LLM) and your queries are vectorized using OpenAI embeddings to surface relevant content from our knowledge base. We keep conversations for 90 days, after which they are deleted automatically. Any contact details you choose to share are retained as a business record.",
        },
      ],
    },
    {
      id: "prospeccion",
      title: "Commercial prospecting",
      blocks: [
        {
          kind: "paragraph",
          text: [
            "If we have analyzed your business or contacted you as part of our commercial prospecting of companies and professionals, the specific information about that processing is in its annex. ",
            { link: "Read the prospecting annex.", href: "/en/privacy/prospeccion" },
          ],
        },
      ],
    },
  ],
}
