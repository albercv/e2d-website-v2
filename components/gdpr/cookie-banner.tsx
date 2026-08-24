"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Cookie, Settings, X } from "lucide-react"

interface CookiePreferences {
  necessary: boolean
  analytics: boolean
  marketing: boolean
  // Opt-in toggle for the AI chat assistant. When false the chat panel
  // should not load (DeepSeek + OpenAI embeddings cookie disclosure).
  // TODO: wire chat-panel.tsx to read this flag from localStorage.
  aiChat: boolean
}

// Maps the saved preferences to a gtag consent update covering both
// analytics (GA) and marketing/ad signals (Apollo, remarketing).
// Must be called after every consent change so the consent mode state
// stays in sync without requiring a page reload.
function applyConsentToGtag(prefs: CookiePreferences) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return
  window.gtag("consent", "update", {
    analytics_storage: prefs.analytics ? "granted" : "denied",
    ad_storage: prefs.marketing ? "granted" : "denied",
    ad_user_data: prefs.marketing ? "granted" : "denied",
    ad_personalization: prefs.marketing ? "granted" : "denied",
  })
}

export function CookieBanner() {
  const t = useTranslations("cookies")
  const [showBanner, setShowBanner] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
    aiChat: false,
  })

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent")
    if (!consent) {
      setShowBanner(true)
      return
    }
    // Older consent payloads may lack the aiChat key — default to false
    // so existing visitors must explicitly opt in to the AI chat toggle.
    const partial = JSON.parse(consent) as Partial<CookiePreferences>
    const savedPreferences: CookiePreferences = {
      necessary: true,
      analytics: false,
      marketing: false,
      aiChat: false,
      ...partial,
    }
    setPreferences(savedPreferences)
    // Replay consent state into gtag so the consent mode reflects what
    // the visitor actually chose in a prior session, not the denied default.
    applyConsentToGtag(savedPreferences)
  }, [])

  const handleAcceptAll = () => {
    const allAccepted: CookiePreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
      aiChat: true,
    }
    setPreferences(allAccepted)
    localStorage.setItem("cookie-consent", JSON.stringify(allAccepted))
    setShowBanner(false)
    applyConsentToGtag(allAccepted)
    // Notify other components (e.g. ApolloTracker) so they can react
    // to the new consent state without a full page reload.
    window.dispatchEvent(new Event("cookie-consent-changed"))
  }

  const handleRejectAll = () => {
    const onlyNecessary: CookiePreferences = {
      necessary: true,
      analytics: false,
      marketing: false,
      aiChat: false,
    }
    setPreferences(onlyNecessary)
    localStorage.setItem("cookie-consent", JSON.stringify(onlyNecessary))
    setShowBanner(false)
    // Downgrade consent signals so any already-initialised trackers honour
    // the rejection and stop collecting data in the current session.
    applyConsentToGtag(onlyNecessary)
    window.dispatchEvent(new Event("cookie-consent-changed"))
  }

  const handleSavePreferences = () => {
    localStorage.setItem("cookie-consent", JSON.stringify(preferences))
    setShowBanner(false)
    setShowSettings(false)
    applyConsentToGtag(preferences)
    window.dispatchEvent(new Event("cookie-consent-changed"))
  }

  const handlePreferenceChange = (type: keyof CookiePreferences) => {
    if (type === "necessary") return // Necessary cookies cannot be disabled
    setPreferences((prev) => ({
      ...prev,
      [type]: !prev[type],
    }))
  }

  return (
    <>
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="fixed bottom-0 left-0 right-0 z-50 p-2 sm:p-4"
            data-ignore-cls="true"
          >
            <Card className="mx-auto max-w-4xl bg-card/95 backdrop-blur-sm border-border">
              <div className="p-3 sm:p-6">
                <div className="flex items-start gap-3 sm:gap-4">
                  <Cookie className="hidden sm:block h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-base sm:text-lg mb-1 sm:mb-2">{t("title")}</h3>
                    <p className="text-muted-foreground mb-3 sm:mb-4 text-xs sm:text-sm leading-relaxed line-clamp-2 sm:line-clamp-none">
                      {t("description")}
                    </p>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      <Button size="sm" onClick={handleAcceptAll} className="bg-primary hover:bg-primary/90">
                        {t("acceptAll")}
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleRejectAll}>
                        {t("rejectAll")}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowSettings(true)} className="gap-2">
                        <Settings className="h-4 w-4" />
                        {t("customize")}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="w-full max-w-2xl"
            >
              <Card className="bg-card">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold">{t("settings.title")}</h2>
                    <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div>
                        <h3 className="font-medium">{t("settings.necessary.title")}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{t("settings.necessary.description")}</p>
                      </div>
                      <div className="text-sm text-muted-foreground">{t("settings.required")}</div>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div>
                        <h3 className="font-medium">{t("settings.analytics.title")}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{t("settings.analytics.description")}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.analytics}
                          onChange={() => handlePreferenceChange("analytics")}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div>
                        <h3 className="font-medium">{t("settings.marketing.title")}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{t("settings.marketing.description")}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.marketing}
                          onChange={() => handlePreferenceChange("marketing")}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    {/* TODO: wire chat-panel to skip mount when preferences.aiChat === false. */}
                    <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div>
                        <h3 className="font-medium">{t("settings.aiChat.title")}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{t("settings.aiChat.description")}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.aiChat}
                          onChange={() => handlePreferenceChange("aiChat")}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <Button variant="outline" onClick={() => setShowSettings(false)}>
                      {t("settings.cancel")}
                    </Button>
                    <Button onClick={handleSavePreferences} className="bg-primary hover:bg-primary/90">
                      {t("settings.save")}
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
