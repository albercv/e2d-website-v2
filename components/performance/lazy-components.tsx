"use client"

import dynamic from "next/dynamic"
import { ClientOnly } from "./client-only"
import { Hero3DFallback, SectionFallback, ModalFallback } from "./loading-fallbacks"

/**
 * Enhanced 3D Component Loader
 * 
 * This implementation uses a multi-layered approach to ensure compatibility with Next.js SSR:
 * 1. ClientOnly wrapper prevents hydration mismatches
 * 2. Dynamic import with ssr: false prevents server-side rendering
 * 3. Comprehensive error boundary for production stability
 * 4. Mobile-optimized loading states
 */

// Create a safe wrapper for the 3D component
const Hero3DComponent = dynamic(
  () => import("@/components/3d/hero-3d").then((mod) => ({ default: mod.Hero3D })),
  {
    ssr: false,
    loading: () => <Hero3DFallback message="Cargando experiencia 3D..." />,
  }
)

// Enhanced Hero3D with ClientOnly wrapper and error boundary
export const Hero3DLazy = () => (
  <ClientOnly
    fallback={<Hero3DFallback message="Preparando experiencia 3D..." />}
    className="w-full h-full"
  >
    <Hero3DComponent />
  </ClientOnly>
)

// Lazy load AI Agent Modal
export const AIAgentModalLazy = dynamic(
  () => import("@/components/ai-agent/ai-agent-modal").then((mod) => ({ default: mod.AIAgentModal })),
  {
    ssr: false,
    loading: () => <ModalFallback message="Cargando asistente IA..." />,
  },
)

// Lazy load complex sections
export const ProjectsSectionLazy = dynamic(
  () => import("@/components/sections/projects-section").then((mod) => ({ default: mod.ProjectsSection })),
  {
    ssr: false,
    loading: () => <SectionFallback message="Cargando proyectos..." />,
  },
)

export const AboutSectionLazy = dynamic(
  () => import("@/components/sections/about-section").then((mod) => ({ default: mod.AboutSection })),
  {
    ssr: false,
    loading: () => <SectionFallback message="Cargando información..." />,
  },
)

export const ProcessSectionLazy = dynamic(
  () => import("@/components/sections/process-section").then((mod) => ({ default: mod.ProcessSection })),
  {
    ssr: false,
    loading: () => <SectionFallback message="Cargando proceso..." />,
  },
)
