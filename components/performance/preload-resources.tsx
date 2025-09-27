"use client"

import { useEffect } from "react"

export function PreloadResources() {
  useEffect(() => {
    // Note: Geist fonts are loaded via the geist package in layout.tsx
    // No need to preload them manually here

    // Preload critical images that exist
    const imagePreloads = ["/professional-headshot-alberto-carrasco.jpg"]

    imagePreloads.forEach((image) => {
      // Check if already preloaded
      const existing = document.querySelector(`link[href="${image}"][rel="preload"]`)
      if (!existing) {
        const link = document.createElement("link")
        link.rel = "preload"
        link.href = image
        link.as = "image"
        document.head.appendChild(link)
      }
    })

    // Temporarily disable prefetch to diagnose the issue
    // const prefetchPages = ["/es/blog", "/en/blog", "/es/docs", "/en/docs"]

    // prefetchPages.forEach((page) => {
    //   // Check if already prefetched
    //   const existing = document.querySelector(`link[href="${page}"][rel="prefetch"]`)
    //   if (!existing) {
    //     const link = document.createElement("link")
    //     link.rel = "prefetch"
    //     link.href = page
    //     document.head.appendChild(link)
    //   }
    // })
  }, [])

  return null
}
