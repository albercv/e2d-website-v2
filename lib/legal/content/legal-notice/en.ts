import type { LegalDocument } from "@/lib/legal/types"
import { mailto } from "../shared"

// English translation. Section ids/order/block shapes mirror es.ts exactly —
// see __tests__/lib/legal-content-parity.test.ts. Title matches the existing
// metadata title in app/[locale]/legal/page.tsx ("Legal Notice").
export const legalNoticeEn: LegalDocument = {
  title: "Legal Notice",
  lastUpdatedLabel: "Last updated",
  lastUpdated: "26 September 2025",
  notice: "This is a translation provided for convenience. In case of discrepancy, the Spanish version prevails.",
  sections: [
    {
      id: "general-info",
      title: "General Information",
      blocks: [
        {
          kind: "paragraph",
          text: "In compliance with Spanish Law 34/2002 of 11 July on Information Society Services and Electronic Commerce (LSSI-CE), the following details are provided:",
        },
        {
          kind: "infoBox",
          rows: [
            { label: "Name", value: "Alberto Carrasco" },
            { label: "Trade name", value: "E2D - Evolve2Digital" },
            { label: "Spanish tax ID (NIF)", value: "51095475D" },
            { label: "Address", value: "Madrid, Spain" },
            { label: "Email", value: [mailto()] },
            { label: "Phone", value: "605497639" },
          ],
        },
      ],
    },
    {
      id: "purpose",
      title: "Purpose",
      blocks: [
        {
          kind: "paragraph",
          text: "This legal notice governs the use of the website evolve2digital.com, owned by Alberto Carrasco. Browsing the website grants the status of user and implies full, unreserved acceptance of all the provisions included in this legal notice.",
        },
      ],
    },
    {
      id: "terms-of-use",
      title: "Terms of Use",
      blocks: [
        {
          kind: "list",
          items: [
            { text: "Access to this website is the sole responsibility of users" },
            { text: "Use of the website implies knowledge and acceptance of the legal notices" },
            { text: "The user undertakes to make appropriate use of the content and services" },
            { text: "It is forbidden to use the website for unlawful or harmful activities" },
          ],
        },
      ],
    },
    {
      id: "intellectual-property",
      title: "Intellectual Property",
      blocks: [
        {
          kind: "paragraph",
          text: "All the contents of the website, including texts, photographs, graphics, images, icons, technology and software, as well as its graphic design and source code, constitute a work whose ownership belongs to Alberto Carrasco, without any of the exploitation rights over them being understood as transferred to the user.",
        },
      ],
    },
    {
      id: "liability",
      title: "Limitation of Liability",
      blocks: [
        { kind: "paragraph", text: "Alberto Carrasco is not responsible for:" },
        {
          kind: "list",
          items: [
            { text: "The continuity and availability of the content" },
            { text: "The absence of errors in such content" },
            { text: "The absence of viruses and/or other harmful components" },
            { text: "Damages caused by third parties through unlawful interference" },
          ],
        },
      ],
    },
    {
      id: "modifications",
      title: "Modifications",
      blocks: [
        {
          kind: "paragraph",
          text: "Alberto Carrasco reserves the right to make, without prior notice, any modifications deemed appropriate to the website, and may change, remove or add content and services provided through it, as well as the way in which they appear or are located on the website.",
        },
      ],
    },
    {
      id: "applicable-law",
      title: "Applicable Law",
      blocks: [
        {
          kind: "paragraph",
          text: "The relationship between Alberto Carrasco and the user shall be governed by current Spanish law, and any dispute shall be submitted to the courts and tribunals of the city of Madrid.",
        },
      ],
    },
  ],
}
