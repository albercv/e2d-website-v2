"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { MessageCircle } from "lucide-react"
import { AIAgentModal } from "./ai-agent-modal"
import { motion, AnimatePresence } from "framer-motion"

export function AIAgentButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 2, type: "spring", stiffness: 260, damping: 20 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="rounded-full w-14 h-14 bg-[#25D366] hover:bg-[#25D366]/90 text-white shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="sr-only">Abrir asistente E2D</span>
        </Button>

        {/* Pulse animation */}
        <div className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20" />
      </motion.div>

      <AnimatePresence>{isOpen && <AIAgentModal isOpen={isOpen} onClose={() => setIsOpen(false)} />}</AnimatePresence>
    </>
  )
}
