import type { Metadata } from "next"
import LegalClientPage from "./LegalClientPage"

export const metadata: Metadata = {
  title: "Aviso Legal | E2D - Evolve2Digital",
  description: "Aviso legal de E2D. Información sobre términos de uso, responsabilidades y condiciones legales.",
}

export default function LegalPage() {
  return <LegalClientPage />
}
