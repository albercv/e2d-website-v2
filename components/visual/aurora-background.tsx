"use client"

import React from "react"

/**
 * AuroraBackground
 *
 * Purpose: Visual, non-intrusive animated background using blurred radial gradients.
 * Inputs: none
 * Outputs: absolutely-positioned decorative layer (aria-hidden)
 * Side-effects: none (pure rendering)
 *
 * Mobile-first: light GPU-friendly animation with low frequency; absolute/fixed sizing avoids layout shifts (CLS-safe).
 */
export function AuroraBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[5] overflow-hidden"
      aria-hidden="true"
      data-ignore-cls="true"
    >
      {/* Teal aurora */}
      <div
        className="absolute -top-40 -left-40 w-[70vw] max-w-[900px] h-[70vw] max-h-[900px] rounded-full blur-3xl"
        style={{
          background: "radial-gradient(ellipse at center, rgba(5,180,186,0.35) 0%, rgba(5,180,186,0.12) 35%, transparent 60%)",
          animation: "aurora 14s ease-in-out infinite",
        }}
      />

      {/* Purple aurora */}
      <div
        className="absolute -bottom-48 -right-32 w-[60vw] max-w-[700px] h-[60vw] max-h-[700px] rounded-full blur-3xl"
        style={{
          background: "radial-gradient(ellipse at center, rgba(168,85,247,0.28) 0%, rgba(168,85,247,0.12) 40%, transparent 65%)",
          animation: "aurora 18s ease-in-out infinite reverse",
        }}
      />

      <style jsx>{`
        @keyframes aurora {
          0% { transform: translate3d(0,0,0) rotate(0deg); opacity: 0.85; }
          50% { transform: translate3d(8%, -6%, 0) rotate(20deg); opacity: 1; }
          100% { transform: translate3d(0,0,0) rotate(0deg); opacity: 0.85; }
        }
      `}</style>
    </div>
  )
}