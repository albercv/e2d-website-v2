"use client"

import { useEffect } from "react"
import Script from "next/script"

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

declare global {
  interface Window {
    gtag: (...args: any[]) => void
    dataLayer: any[]
  }
}

export function GoogleAnalytics() {
  useEffect(() => {
    // Initialize gtag with denied consent by default
    if (typeof window !== "undefined") {
      window.dataLayer = window.dataLayer || []
      window.gtag = function gtag() {
        window.dataLayer.push(arguments)
      }
      window.gtag("js", new Date())
      window.gtag("config", GA_MEASUREMENT_ID, {
        page_title: document.title,
        page_location: window.location.href,
      })

      // Set default consent state
      window.gtag("consent", "default", {
        analytics_storage: "denied",
        ad_storage: "denied",
        wait_for_update: 500,
      })
    }
  }, [])

  if (!GA_MEASUREMENT_ID) {
    return null
  }

  return (
    <>
      <Script strategy="afterInteractive" src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} />
    </>
  )
}

// Analytics event tracking functions
export const trackEvent = (action: string, category: string, label?: string, value?: number) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", action, {
      event_category: category,
      event_label: label,
      value: value,
    })
  }
}

export const trackPageView = (url: string, title: string) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("config", GA_MEASUREMENT_ID, {
      page_title: title,
      page_location: url,
    })
  }
}

export const trackConversion = (conversionId: string, value?: number, currency?: string) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "conversion", {
      send_to: conversionId,
      value: value,
      currency: currency || "EUR",
    })
  }
}
