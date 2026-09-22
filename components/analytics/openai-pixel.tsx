"use client"

import { useEffect, useState } from "react"
import Script from "next/script"

declare global {
  interface Window {
    oaiq?: (...args: unknown[]) => void
  }
}

const SDK_URL = "https://bzrcdn.openai.com/sdk/oaiq.min.js"

// Reads the marketing consent flag from localStorage. Absent, malformed or
// denied all map to false so the pixel is never injected before opt-in.
function hasMarketingConsent(): boolean {
  try {
    const raw = localStorage.getItem("cookie-consent")
    if (!raw) return false
    const parsed = JSON.parse(raw) as { marketing?: boolean }
    return parsed.marketing === true
  } catch {
    return false
  }
}

// Same gate as GA: dev/staging traffic must never reach the pixel, and a
// missing id means the integration is simply not configured for this deploy.
function isPixelEnabled(): boolean {
  return process.env.NODE_ENV === "production" && Boolean(process.env.NEXT_PUBLIC_OAIQ_PIXEL_ID)
}

// Queue stub straight from OpenAI's snippet: buffers oaiq() calls until the
// SDK loads and drains them. JSON.stringify guards against an id that could
// break out of the string literal.
function initSnippet(pixelId: string): string {
  return `
    window.oaiq = window.oaiq || function () {
      (window.oaiq.q = window.oaiq.q || []).push(arguments);
    };
    oaiq("init", { pixelId: ${JSON.stringify(pixelId)} });
  `
}

export function OpenAIPixel() {
  const [marketingAllowed, setMarketingAllowed] = useState(false)

  useEffect(() => {
    setMarketingAllowed(hasMarketingConsent())

    // Re-read on banner changes so the pixel loads in the same session
    // without a reload — mirrors ApolloTracker.
    const handleConsentChange = () => setMarketingAllowed(hasMarketingConsent())
    window.addEventListener("cookie-consent-changed", handleConsentChange)
    return () => window.removeEventListener("cookie-consent-changed", handleConsentChange)
  }, [])

  // The OpenAI pixel is an ad-attribution tracker: GDPR classifies it as
  // marketing, so it only loads after explicit marketing consent.
  if (!marketingAllowed || !isPixelEnabled()) return null

  const pixelId = process.env.NEXT_PUBLIC_OAIQ_PIXEL_ID as string

  return (
    <>
      <Script id="oaiq-init" strategy="afterInteractive">
        {initSnippet(pixelId)}
      </Script>
      <Script id="oaiq-sdk" strategy="afterInteractive" src={SDK_URL} />
    </>
  )
}
