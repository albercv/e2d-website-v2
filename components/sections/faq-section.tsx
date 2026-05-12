"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Minus } from "lucide-react"
import { useLocale } from "next-intl"
import { FAQ_DATA } from "@/lib/faq/faq-data"
import type { RuntimeLocale } from "@/lib/blog/posts-runtime"

function FaqJsonLd({ items }: { items: { question: string; answer: string }[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
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

export function FaqSection() {
  const locale = useLocale() as RuntimeLocale
  const data = FAQ_DATA[locale] ?? FAQ_DATA.es
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggle = (i: number) => setOpenIndex((prev) => (prev === i ? null : i))

  return (
    <section id="faq" className="relative py-28 overflow-hidden bg-[#050a0f]">
      <FaqJsonLd items={data.items} />

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
          {data.items.map((item, i) => {
            const isOpen = openIndex === i
            return (
              <motion.div key={i} variants={itemVariants}>
                <div
                  className="relative rounded-xl border transition-colors duration-300 cursor-pointer group overflow-hidden"
                  style={{
                    borderColor: isOpen ? "rgba(5,180,186,0.5)" : "rgba(255,255,255,0.07)",
                    background: isOpen
                      ? "linear-gradient(135deg, rgba(5,180,186,0.08) 0%, rgba(5,180,186,0.03) 100%)"
                      : "rgba(255,255,255,0.02)",
                  }}
                  onClick={() => toggle(i)}
                >
                  {/* Glow on open */}
                  {isOpen && (
                    <div
                      aria-hidden
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        boxShadow: "inset 0 0 40px rgba(5,180,186,0.06)",
                      }}
                    />
                  )}

                  {/* Question row */}
                  <div className="flex items-start gap-4 px-5 py-5">
                    {/* Number badge */}
                    <span
                      className="shrink-0 mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-colors duration-300"
                      style={{
                        background: isOpen
                          ? "linear-gradient(135deg, #05b4ba, #7ee8eb)"
                          : "rgba(5,180,186,0.12)",
                        color: isOpen ? "#050a0f" : "#05b4ba",
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>

                    <span className="flex-1 text-sm font-semibold text-slate-100 leading-snug pr-2">
                      {item.question}
                    </span>

                    <span
                      className="shrink-0 mt-0.5 w-6 h-6 rounded-md flex items-center justify-center transition-all duration-300"
                      style={{
                        background: isOpen ? "rgba(5,180,186,0.2)" : "rgba(255,255,255,0.05)",
                      }}
                    >
                      {isOpen ? (
                        <Minus className="w-3.5 h-3.5 text-[#05b4ba]" />
                      ) : (
                        <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#05b4ba] transition-colors" />
                      )}
                    </span>
                  </div>

                  {/* Answer */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="answer"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pb-5 text-sm text-slate-400 leading-relaxed pl-16">
                          {item.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
