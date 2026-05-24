"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import Script from "next/script"

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void
    dataLayer: unknown[]
  }
}

export function GoogleAnalytics() {
  const pathname = usePathname()
  // Track whether the initial mount has already fired its page_view via gtag("config",...)
  // so the pathname effect skips the first run and avoids a duplicate hit.
  const initialMountDone = useRef(false)

  // Gate everything on production + measurement ID present.
  // Dev/staging traffic must never reach GA — it inflates metrics and
  // corrupts audience data.
  const isEnabled =
    process.env.NODE_ENV === "production" && Boolean(GA_MEASUREMENT_ID)

  useEffect(() => {
    if (!isEnabled) return

    window.dataLayer = window.dataLayer || []
    // gtag.js only treats a dataLayer entry as an API command when the pushed
    // value is an `arguments` object. Pushing a plain array — which rest
    // params produce — makes gtag.js silently ignore every js/consent/config/
    // event command, so no measurement initialises and no hits are ever sent.
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments)
    }

    window.gtag("js", new Date())

    // Consent must be declared BEFORE config so GA honours it from the very
    // first hit. Sending config first would fire an unconsented page_view.
    window.gtag("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      wait_for_update: 500,
    })

    window.gtag("config", GA_MEASUREMENT_ID!, {
      page_title: document.title,
      page_location: window.location.href,
    })

    initialMountDone.current = true
  }, [isEnabled])

  useEffect(() => {
    // Skip the first render — gtag("config",...) in the init effect already
    // sends the landing page_view; firing again here would double-count it.
    if (!isEnabled || !initialMountDone.current) return

    window.gtag("event", "page_view", {
      page_location: window.location.href,
      page_title: document.title,
    })
  }, [pathname, isEnabled])

  if (!isEnabled) return null

  return (
    <Script
      strategy="afterInteractive"
      src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
    />
  )
}

// Analytics event tracking functions
export const trackEvent = (action: string, category: string, label?: string, value?: number) => {
  if (typeof window !== "undefined" && GA_MEASUREMENT_ID && window.gtag) {
    window.gtag("event", action, {
      event_category: category,
      event_label: label,
      value: value,
    })
  }
}

export const trackPageView = (url: string, title: string) => {
  if (typeof window !== "undefined" && GA_MEASUREMENT_ID && window.gtag) {
    window.gtag("config", GA_MEASUREMENT_ID, {
      page_title: title,
      page_location: url,
    })
  }
}

export const trackConversion = (conversionId: string, value?: number, currency?: string) => {
  if (typeof window !== "undefined" && GA_MEASUREMENT_ID && window.gtag) {
    window.gtag("event", "conversion", {
      send_to: conversionId,
      value: value,
      currency: currency || "EUR",
    })
  }
}
