"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Plus, Minus } from "lucide-react"
import { useLocale } from "next-intl"
import { FAQ_DATA, type FaqItem } from "@/lib/faq/faq-data"
import type { RuntimeLocale } from "@/lib/blog/posts-runtime"

// Literal on purpose: the shared entity module lands in another task.
const SITE_URL = "https://evolve2digital.com"

function FaqJsonLd({ items, locale }: { items: FaqItem[]; locale: RuntimeLocale }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${SITE_URL}/${locale}#faq`,
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
}

interface FaqAccordionItemProps {
  index: number
  item: FaqItem
  isOpen: boolean
  onToggle: (index: number) => void
}

function FaqAccordionItem({ index, item, isOpen, onToggle }: FaqAccordionItemProps) {
  const buttonId = `faq-question-${index}`
  const panelId = `faq-answer-${index}`

  return (
    <motion.div variants={itemVariants}>
      <div
        className="relative rounded-xl border transition-colors duration-300 group overflow-hidden"
        style={{
          borderColor: isOpen ? "rgba(5,180,186,0.5)" : "rgba(255,255,255,0.07)",
          background: isOpen
            ? "linear-gradient(135deg, rgba(5,180,186,0.08) 0%, rgba(5,180,186,0.03) 100%)"
            : "rgba(255,255,255,0.02)",
        }}
      >
        {/* Glow on open */}
        {isOpen && (
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{ boxShadow: "inset 0 0 40px rgba(5,180,186,0.06)" }}
          />
        )}

        <h3>
          <button
            type="button"
            id={buttonId}
            aria-expanded={isOpen}
            aria-controls={panelId}
            onClick={() => onToggle(index)}
            className="flex w-full items-start gap-4 rounded-xl px-5 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#05b4ba]/70"
          >
            {/* Number badge */}
            <span
              aria-hidden
              className="shrink-0 mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-colors duration-300"
              style={{
                background: isOpen ? "linear-gradient(135deg, #05b4ba, #7ee8eb)" : "rgba(5,180,186,0.12)",
                color: isOpen ? "#050a0f" : "#05b4ba",
              }}
            >
              {String(index + 1).padStart(2, "0")}
            </span>

            <span className="flex-1 text-sm font-semibold text-slate-100 leading-snug pr-2">
              {item.question}
            </span>

            <span
              aria-hidden
              className="shrink-0 mt-0.5 w-6 h-6 rounded-md flex items-center justify-center transition-all duration-300"
              style={{ background: isOpen ? "rgba(5,180,186,0.2)" : "rgba(255,255,255,0.05)" }}
            >
              {isOpen ? (
                <Minus className="w-3.5 h-3.5 text-[#05b4ba]" />
              ) : (
                <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#05b4ba] transition-colors" />
              )}
            </span>
          </button>
        </h3>

        {/* Always rendered so crawlers and the JSON-LD see the same text; the
            grid row collapses it and `visibility` removes it from tab order and
            the accessibility tree once the transition ends. */}
        <div
          id={panelId}
          role="region"
          aria-labelledby={buttonId}
          className="grid transition-[grid-template-rows,opacity,visibility] duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{
            gridTemplateRows: isOpen ? "1fr" : "0fr",
            opacity: isOpen ? 1 : 0,
            visibility: isOpen ? "visible" : "hidden",
          }}
        >
          <div className="overflow-hidden">
            <p className="px-5 pb-5 text-sm text-slate-400 leading-relaxed pl-16">{item.answer}</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function FaqSection() {
  const locale = useLocale() as RuntimeLocale
  const resolvedLocale: RuntimeLocale = locale in FAQ_DATA ? locale : "es"
  const data = FAQ_DATA[resolvedLocale]
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggle = (i: number) => setOpenIndex((prev) => (prev === i ? null : i))

  return (
    <section id="faq" className="relative py-28 overflow-hidden bg-[#050a0f]">
      <FaqJsonLd items={data.items} locale={resolvedLocale} />

      {/* Background grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(5,180,186,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(5,180,186,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Top glow blob */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full opacity-20"
        style={{
          background: "radial-gradient(ellipse at center, #05b4ba 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-6">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16"
        >
          <span className="inline-block mb-4 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase border border-[#05b4ba]/30 text-[#05b4ba] bg-[#05b4ba]/5">
            FAQ
          </span>
          <h2
            className="text-4xl sm:text-5xl font-bold tracking-tight mb-4"
            style={{
              background: "linear-gradient(135deg, #ffffff 0%, #05b4ba 60%, #7ee8eb 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {data.sectionTitle}
          </h2>
          <p className="text-base text-slate-400 max-w-xl mx-auto">{data.sectionSubtitle}</p>
        </motion.div>

        {/* Items */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="space-y-3"
        >
          {data.items.map((item, i) => (
            <FaqAccordionItem
              key={item.question}
              index={i}
              item={item}
              isOpen={openIndex === i}
              onToggle={toggle}
            />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
