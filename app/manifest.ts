import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "E2D - Evolve2Digital",
    short_name: "E2D",
    description: "Automatiza tu pyme: más ventas, menos tareas. Especialistas en automatización para PYMEs.",
    start_url: "/es",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#05b4ba",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    categories: ["business", "productivity", "technology"],
    lang: "es",
  }
}
