import type { Metadata } from "next"
import PrivacyClientPage from "./privacy-client"

export const metadata: Metadata = {
  title: "Política de Privacidad | E2D - Evolve2Digital",
  description:
    "Política de privacidad y protección de datos de E2D. Información sobre el tratamiento de datos personales según GDPR.",
}

export default function PrivacyPage() {
  return <PrivacyClientPage />
}
