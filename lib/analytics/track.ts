// GA4 event helper — wraps window.gtag with a safe guard so call sites need
// no conditional logic and the app stays quiet when analytics is absent.
// The Window.gtag type augmentation lives in google-analytics.tsx (global scope)
// so we rely on it rather than re-declaring to avoid duplicate-identifier errors.

export function track(event: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return
  if (typeof window.gtag !== "function") return
  window.gtag("event", event, params ?? {})
}
