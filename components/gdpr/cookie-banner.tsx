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
}

export function CookieBanner() {
  const t = useTranslations("cookies")
  const [showBanner, setShowBanner] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
  })

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent")
    if (!consent) {
      setShowBanner(true)
    } else {
      const savedPreferences = JSON.parse(consent)
      setPreferences(savedPreferences)
      // Initialize analytics based on consent
      if (savedPreferences.analytics) {
        initializeAnalytics()
      }
    }
  }, [])

  const initializeAnalytics = () => {
    // Initialize Google Analytics
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("consent", "update", {
        analytics_storage: "granted",
      })
    }
  }

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
    }
    setPreferences(allAccepted)
    localStorage.setItem("cookie-consent", JSON.stringify(allAccepted))
    setShowBanner(false)
    initializeAnalytics()
  }

  const handleRejectAll = () => {
    const onlyNecessary = {
      necessary: true,
      analytics: false,
      marketing: false,
    }
    setPreferences(onlyNecessary)
    localStorage.setItem("cookie-consent", JSON.stringify(onlyNecessary))
    setShowBanner(false)
  }

  const handleSavePreferences = () => {
    localStorage.setItem("cookie-consent", JSON.stringify(preferences))
    setShowBanner(false)
    setShowSettings(false)
    if (preferences.analytics) {
      initializeAnalytics()
    }
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
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4"
          >
            <Card className="mx-auto max-w-4xl bg-card/95 backdrop-blur-sm border-border">
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <Cookie className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">{t("title")}</h3>
                    <p className="text-muted-foreground mb-4 text-sm leading-relaxed">{t("description")}</p>
                    <div className="flex flex-wrap gap-3">
                      <Button onClick={handleAcceptAll} className="bg-primary hover:bg-primary/90">
                        {t("acceptAll")}
                      </Button>
                      <Button variant="outline" onClick={handleRejectAll}>
                        {t("rejectAll")}
                      </Button>
                      <Button variant="ghost" onClick={() => setShowSettings(true)} className="gap-2">
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
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
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
