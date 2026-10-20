import type { ReactNode } from "react"

// Visual vocabulary shared by the Spanish-only pages: same container width,
// type scale and #05b4ba accent as the blog and the legal pages.

const LINK_CLASS = "text-[#05b4ba] underline-offset-4 hover:underline"

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="container mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">{children}</div>
}

interface PageHeaderProps {
  eyebrow: string
  title: string
  lead: ReactNode
}

export function PageHeader({ eyebrow, title, lead }: PageHeaderProps) {
  return (
    <header className="mb-12">
      <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#05b4ba]">{eyebrow}</p>
      <h1 className="mb-4 text-4xl font-bold text-foreground text-balance sm:text-5xl">{title}</h1>
      <p className="text-lg leading-relaxed text-muted-foreground text-pretty">{lead}</p>
    </header>
  )
}

interface PageSectionProps {
  id: string
  title: string
  children: ReactNode
}

export function PageSection({ id, title, children }: PageSectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="mb-12 scroll-mt-24">
      <h2 id={`${id}-title`} className="mb-4 text-2xl font-semibold text-foreground sm:text-3xl">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

export function Paragraph({ children }: { children: ReactNode }) {
  return <p className="leading-relaxed text-muted-foreground">{children}</p>
}

export function BulletList({ items }: { items: readonly ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-6 leading-relaxed text-muted-foreground">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  )
}

export function StepList({ steps }: { steps: ReadonlyArray<{ title: string; text: ReactNode }> }) {
  return (
    <ol className="space-y-4">
      {steps.map((step, index) => (
        <li key={step.title} className="flex gap-4">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#05b4ba]/40 bg-[#05b4ba]/10 text-sm font-semibold text-[#05b4ba]"
          >
            {index + 1}
          </span>
          <div>
            <h3 className="font-semibold text-foreground">{step.title}</h3>
            <p className="leading-relaxed text-muted-foreground">{step.text}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

interface TextLinkProps {
  href: string
  children: ReactNode
  external?: boolean
}

export function TextLink({ href, children, external = false }: TextLinkProps) {
  if (!external) {
    return (
      <a href={href} className={LINK_CLASS}>
        {children}
      </a>
    )
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
      {children}
    </a>
  )
}

interface InfoCardProps {
  title: ReactNode
  label?: ReactNode
  children: ReactNode
}

export function InfoCard({ title, label, children }: InfoCardProps) {
  return (
    <article className="rounded-lg border border-border bg-card/50 p-5">
      {label && <div className="mb-2">{label}</div>}
      <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </article>
  )
}

export function CardGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
}
