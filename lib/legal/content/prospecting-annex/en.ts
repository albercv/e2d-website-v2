import type { LegalDocument } from "@/lib/legal/types"
import { mailto } from "../shared"

// English translation. Section ids/order/block shapes mirror es.ts exactly —
// see __tests__/lib/legal-content-parity.test.ts. GDPR terms follow the
// mandatory glossary from the translation brief (Controller, Processor,
// Third-party recipient, legitimate interest, Art. 6(1)(f) GDPR, etc.).
export const prospectingAnnexEn: LegalDocument = {
  title: "Commercial prospecting of companies and professionals",
  eyebrow: "Annex to the privacy policy",
  backLink: { href: "/en/privacy", text: "← Privacy policy" },
  lastUpdatedLabel: "Last updated",
  lastUpdated: "28 September 2026",
  notice: "This is a translation provided for convenience. In case of discrepancy, the Spanish version prevails.",
  sections: [
    {
      id: "intro",
      blocks: [
        {
          kind: "paragraph",
          text: "Evolve2Digital (E2D) provides automation and custom software services to small and medium-sized businesses. To find businesses that could benefit from these services, we analyze public business information. This section explains what data we process, for what purpose and how you can object.",
        },
      ],
    },
    {
      id: "responsable",
      title: "Controller",
      blocks: [
        {
          kind: "paragraph",
          text: [
            "Alberto Carrasco, sole trader (autónomo) trading as E2D - Evolve2Digital, with Spanish tax ID (NIF) 51095475D and address in Madrid (Spain). Contact for any privacy matter: ",
            mailto(),
            ".",
          ],
        },
      ],
    },
    {
      id: "datos",
      title: "What data we process and where it comes from",
      blocks: [
        { kind: "paragraph", text: "We only process business data that the business itself has published:" },
        {
          kind: "list",
          items: [
            {
              text: "From its public Google Maps listing, obtained through the provider Apify: trade name, categories, address, postal code and municipality, published phone number, website, link to the listing, number of reviews, average rating, whether it is closed, and the date of its most recent reviews. We do not collect the text of the reviews or any data about the people who wrote them.",
            },
            {
              text: "From the business website: technical measurements (speed and technologies), screenshots, the published texts, the published contact email (with the page it came from), and the data from its legal notice about the owner and the size of the business.",
            },
          ],
        },
        {
          kind: "paragraph",
          text: "We do not purchase databases or look for data about individuals in other sources. If the business belongs to a sole trader (autónomo), this business data is their personal data, and this section applies to them.",
        },
      ],
    },
    {
      id: "finalidades",
      title: "What we process it for",
      blocks: [
        {
          kind: "list",
          items: [
            {
              label: "Commercial prospecting:",
              text: "finding active, independent businesses whose website could be improved, in order to offer them our customer-acquisition automation services, including the website.",
            },
            {
              label: "Automated assessment and classification:",
              text: "our system automatically evaluates each business to decide who we direct our prospecting to. It classifies it as a chain or an independent business, and as active or not based on the number and date of its reviews; later it also assesses the technical and visual quality of its website and ranks businesses by improvement opportunity. If the business belongs to a sole trader, this assessment is profiling for direct marketing purposes, and you may object to it at any time (Art. 21(2) GDPR), as explained below.",
            },
            {
              label: "Contact:",
              text: "we send only a few businesses a single email with a proposal, and each send is reviewed and approved by a person. We do not carry out automatic follow-ups.",
            },
          ],
        },
      ],
    },
    {
      id: "base-juridica",
      title: "Legal basis",
      blocks: [
        {
          kind: "paragraph",
          text: "E2D's legitimate interest in offering its professional services to other businesses (Art. 6(1)(f) GDPR). We have weighed that interest against your rights: we only process business data that you have published to make yourself known, to the minimum extent necessary, we keep it for a maximum of 30 days if we do not contact you, and we do not contact you without a prior human review.",
        },
        {
          kind: "paragraph",
          text: "Since we analyze many businesses and contact only a few, informing each one individually would require contacting them, which is exactly what we want to avoid. That is why we publish this information here (Art. 14(5)(b) GDPR). If we contact you, the email itself informs you about the processing.",
        },
      ],
    },
    {
      id: "destinatarios",
      title: "Recipients",
      blocks: [
        {
          kind: "table",
          columns: ["Recipient", "Role", "Purpose"],
          rows: [
            {
              header: "Apify",
              cells: [
                "Processor",
                "Obtaining public information from Google Maps listings. Its results are deleted from Apify as soon as we receive them",
              ],
            },
            {
              header: "Google",
              cells: [
                "Processor",
                "Measuring the website (PageSpeed Insights) and hosting proposals, emails and the opt-out record (Google Workspace)",
              ],
            },
            {
              header: "Anthropic, via its API (once this phase is activated)",
              cells: [
                "Processor, under a data processing agreement and standard contractual clauses",
                "Extracting data from the website and drafting the proposal and email for the few selected businesses. Before sending it any text, we remove emails, phone numbers and ID documents",
              ],
            },
            {
              header: "Anthropic, via the Claude subscription (once this phase is activated)",
              cells: [
                "Third-party recipient, under its consumer terms of use and without a data processing agreement. With the use of data to improve its models disabled, it retains it for 30 days",
                "Assessing the visual quality of the website from public website screenshots",
              ],
            },
          ],
        },
        { kind: "paragraph", text: "We do not disclose your data to anyone else, except where legally required." },
      ],
    },
    {
      id: "transferencias",
      title: "International transfers",
      blocks: [
        {
          kind: "paragraph",
          text: "Some providers process data in the United States. Google adheres to the EU-U.S. Data Privacy Framework and also applies standard contractual clauses. Apify is a European Union company (Czech Republic); if its infrastructure processes data outside the EU, it does so under standard contractual clauses. With Anthropic, via its API, the transfer is covered by standard contractual clauses; via the subscription, by the safeguards stated in its privacy policy.",
        },
      ],
    },
    {
      id: "conservacion",
      title: "How long we keep it",
      blocks: [
        {
          kind: "list",
          items: [
            {
              label: "Analysis data:",
              text: "30 days from when we collect it, after which it is deleted. We only keep anonymous statistics.",
            },
            {
              label: "If we have sent you an email:",
              text: "the minimal record of the send and your response, and the sending mailbox, for 12 months.",
            },
            { label: "Queries to the Robinson List (Spain's advertising opt-out register):", text: "one month from the query." },
            {
              label: "If you object:",
              text: "a minimal, permanent record so we do not process your business again: the email and phone number, stored only in pseudonymized form with a key (HMAC), plus the identifier of your Google Maps listing and your website's domain.",
            },
            {
              label: "Backups:",
              text: "7 days, and they do not include analysis data. In Google Drive, the administrator can restore deleted items for 25 days.",
            },
          ],
        },
      ],
    },
    {
      id: "derechos",
      title: "Your rights and how to exercise them",
      blocks: [
        {
          kind: "paragraph",
          text: [
            "You can exercise the rights of access, rectification, erasure, restriction and objection by writing to ",
            mailto(),
            ". Please state the name of your business and its website or the link to its Google Maps listing, so we can locate it.",
          ],
        },
        {
          kind: "list",
          items: [
            {
              id: "oposicion",
              label: "Objection (Art. 21 GDPR):",
              text: "you can object at any time to commercial prospecting and to the profiling related to it, without needing to justify it. We stop processing your business for that purpose and add it to our permanent suppression list, so it is not analyzed or contacted again.",
            },
            {
              label: "Erasure (Art. 17 GDPR):",
              text: "we delete your business's data from ongoing analyses and keep only the minimal suppression record, so as not to process it again.",
            },
          ],
        },
        {
          kind: "paragraph",
          text: [
            "If you believe we have not properly handled your request, you can file a complaint with the Spanish Data Protection Agency (Agencia Española de Protección de Datos, AEPD; ",
            { link: "www.aepd.es", href: "https://www.aepd.es", external: true },
            ").",
          ],
        },
      ],
    },
  ],
}
