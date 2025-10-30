"use client"

import { useRouter, usePathname } from "next/navigation"
import { buttonVariants } from "@/components/ui/button"
import { Globe } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function LanguageSwitcher() {
  const router = useRouter()
  const pathname = usePathname()

  const switchLanguage = (locale: string) => {
    const segments = pathname.split("/")
    segments[1] = locale
    router.push(segments.join("/"))
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
        <DropdownMenuItem onClick={() => switchLanguage("es")}>🇪🇸 Español</DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLanguage("en")}>🇬🇧 English</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
