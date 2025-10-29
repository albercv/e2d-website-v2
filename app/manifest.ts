import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "E2D - Evolve2Digital",
    short_name: "E2D",
    description: "Automatiza tu empresa: más ventas, menos tareas. Especialistas en automatización para PYMEs.",
    start_url: "/es",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#05b4ba",
    icons: [
      {
        src: "/e2dFavicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/e2d_logo.webp",
        sizes: "192x192",
        type: "image/webp",
        purpose: "any",
      },
      {
        src: "/e2d_logo.webp",
        sizes: "512x512",
        type: "image/webp",
        purpose: "any",
      },
    ],
    categories: ["business", "productivity", "technology"],
    lang: "es",
  }
}
