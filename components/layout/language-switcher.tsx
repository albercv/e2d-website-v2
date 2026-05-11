"use client"

import { useRouter, usePathname } from "next/navigation"
import { buttonVariants } from "@/components/ui/button"
import { Globe } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useLocaleAlternates } from "./locale-alternates-context"
import type { LocaleAlternates } from "./locale-alternates-context"

const LOCALES = [
  { code: "es", label: "🇪🇸 Español" },
  { code: "en", label: "🇬🇧 English" },
  { code: "it", label: "🇮🇹 Italiano" },
] as const

export function resolveTargetPath(
  pathname: string,
  targetLocale: string,
  alternates: LocaleAlternates | null
): string {
  const fromContext = alternates?.[targetLocale]
  if (fromContext) return fromContext

  const segments = pathname.split("/")
  if (segments.length < 2) return `/${targetLocale}`
  segments[1] = targetLocale
  return segments.join("/")
}

export function LanguageSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const alternates = useLocaleAlternates()

  const switchLanguage = (locale: string) => {
    router.push(resolveTargetPath(pathname, locale, alternates))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={buttonVariants({ variant: "ghost", size: "sm", className: "text-muted-foreground" })}
      >
        <Globe className="h-4 w-4 mr-2" />
        <span className="sr-only">Switch language</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map(({ code, label }) => (
          <DropdownMenuItem key={code} onClick={() => switchLanguage(code)}>
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
