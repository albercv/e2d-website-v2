import type { EvidenceKind } from "@/lib/showcase/projects"

// The three audit labels tell a reader what kind of evidence an example is, so
// a demonstration or an own project is never mistaken for a client case.
const LABELS: Record<EvidenceKind, string> = {
  client: "Caso de cliente",
  own: "Proyecto propio",
  demo: "Demostración",
  portfolio: "En mi portfolio",
}

export function EvidenceLabel({ kind }: { kind: EvidenceKind }) {
  return (
    <span className="inline-block rounded-full border border-[#05b4ba]/40 bg-[#05b4ba]/10 px-2.5 py-0.5 text-xs font-medium text-[#05b4ba]">
      {LABELS[kind]}
    </span>
  )
}
