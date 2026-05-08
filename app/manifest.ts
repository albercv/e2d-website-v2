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
        src: "/favicon.ico",
        sizes: "16x16 32x32 48x48",
        type: "image/x-icon",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
    categories: ["business", "productivity", "technology"],
    lang: "es",
  }
}
