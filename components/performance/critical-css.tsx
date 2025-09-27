"use client"

export function CriticalCSS() {
  return (
    <style jsx>{`
      /* Critical CSS for above-the-fold content */
      .hero-section {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: hsl(var(--background));
      }
      
      .nav-fixed {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 50;
        background: hsl(var(--background) / 0.8);
        backdrop-filter: blur(12px);
        border-bottom: 1px solid hsl(var(--border));
      }
      
      .text-balance {
        text-wrap: balance;
      }
      
      .text-pretty {
        text-wrap: pretty;
      }
      
      /* Reduce motion for accessibility */
      @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
    `}</style>
  )
}
