import type { Inline, RichText } from "@/lib/legal/types"

/** Renders one inline fragment: plain text, `<strong>`, or a link (mailto or external). */
function InlineFragment({ fragment, index }: { fragment: Inline; index: number }) {
  if (typeof fragment === "string") return <>{fragment}</>

  if ("strong" in fragment) return <strong key={index}>{fragment.strong}</strong>

  const isMailto = fragment.href.startsWith("mailto:")
  const externalProps =
    fragment.external && !isMailto ? { target: "_blank", rel: "noopener noreferrer" } : {}

  // No @tailwindcss/typography here, so `prose` leaves links unstyled.
  return (
    <a key={index} href={fragment.href} className="underline underline-offset-2 hover:text-foreground" {...externalProps}>
      {fragment.link}
    </a>
  )
}

/** Renders a `RichText` value: a plain string, or an array of inline fragments. */
export function RichTextView({ value }: { value: RichText }) {
  if (typeof value === "string") return <>{value}</>

  return (
    <>
      {value.map((fragment, index) => (
        <InlineFragment key={index} fragment={fragment} index={index} />
      ))}
    </>
  )
}
