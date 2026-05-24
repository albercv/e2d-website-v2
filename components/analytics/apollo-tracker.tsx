"use client"

import { useState, useEffect } from "react"
import Script from "next/script"

declare global {
  interface Window {
    trackingFunctions: {
      onLoad: (opts: { appId: string }) => void
    }
  }
}

// Reads the current marketing consent flag from localStorage.
// Returns false when consent is absent, malformed, or explicitly denied —
// so the tracker is never injected before an explicit opt-in.
function hasMarketingConsent(): boolean {
  try {
    const raw = localStorage.getItem("cookie-consent")
    if (!raw) return false
    const parsed = JSON.parse(raw) as { marketing?: boolean }
    return parsed.marketing === true
  } catch {
    // Malformed JSON — treat as no consent to be safe.
    return false
  }
}

export function ApolloTracker() {
  const [marketingAllowed, setMarketingAllowed] = useState(false)

  useEffect(() => {
    // Check consent on mount — covers returning visitors who already consented.
    setMarketingAllowed(hasMarketingConsent())

    // Re-read consent whenever the banner fires a change event so the script
    // loads in the same session without requiring a page reload.
    const handleConsentChange = () => {
      setMarketingAllowed(hasMarketingConsent())
    }

    window.addEventListener("cookie-consent-changed", handleConsentChange)
    return () => {
      window.removeEventListener("cookie-consent-changed", handleConsentChange)
    }
  }, [])

  // Do not inject the tracker until marketing consent is explicitly granted.
  // Injecting pre-consent is a GDPR violation: Apollo identifies visitors
  // by IP/fingerprint and is classified as a marketing/tracking tool.
  if (!marketingAllowed) return null

  return (
    <Script id="apollo-tracker" strategy="afterInteractive">{`
      (function(){
        var n=Math.random().toString(36).substring(7),o=document.createElement("script");
        o.src="https://assets.apollo.io/micro/website-tracker/tracker.iife.js?nocache="+n;
        o.async=true;o.defer=true;
        o.onload=function(){window.trackingFunctions.onLoad({appId:"6a04409482614e0019067475"})};
        document.head.appendChild(o);
      })();
    `}</Script>
  )
}
