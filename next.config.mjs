import createNextIntlPlugin from 'next-intl/plugin'
import { withContentlayer } from 'next-contentlayer2'
import bundleAnalyzer from '@next/bundle-analyzer'

const withNextIntl = createNextIntlPlugin('./i18n.ts')
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // SEO/security: ocultar el header `X-Powered-By: Next.js` para no revelar
  // el framework ni facilitar la búsqueda de exploits por versión.
  poweredByHeader: false,
  // BUG-16: `content/posts` es por diseño un symlink a /var/lib/e2d-content/
  // posts (el reader de posts-runtime.ts atraviesa el symlink en walkMdx,
  // ver línea 70). next-tracer copia `content/` al standalone siguiendo el
  // symlink, y el cleanup pre-build de .next/standalone/content/posts/
  // hereda esa naturaleza — los rm recursivos atraviesan el symlink y
  // wipean producción. Excluimos del tracing para que el standalone no
  // tenga ningún rastro del symlink. El runtime sigue leyendo del symlink
  // del repo (CONTENT_ROOT/content/posts), no del standalone.
  // BUG-16: ver bloque anterior. BUG-18: cada next build copiaba data/oauth.sqlite
  // del repo al standalone, pisando los DCR clients (e2d_xxx) y refresh_tokens
  // creados en runtime. Resultado: tras cada deploy ChatGPT y Claude.ai recibían
  // 400 al refrescar token y tenían que reconectar. Excluir data/** del tracing
  // mantiene la BD persistente entre builds. Fix definitiva: mover la BD a
  // /var/lib/e2d-content/data/ con env var OAUTH_DB_PATH (pendiente).
  outputFileTracingExcludes: {
    '*': ['content/posts/**', 'content/posts', 'data/**', 'data'],
  },
  // next-mdx-remote es ESM puro: hay que transpilarlo para que funcione en
  // server components (CJS) y en build standalone.
  transpilePackages: ['next-mdx-remote'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['images.unsplash.com', 'via.placeholder.com'],
    unoptimized: true,
  },
  // Optimizaciones agresivas de rendimiento
  experimental: {
    optimizePackageImports: [
      'framer-motion', 
      'lucide-react', 
      '@radix-ui/react-dialog', 
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-slot',
      '@radix-ui/react-label',
      '@radix-ui/react-tabs',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-switch',
      '@radix-ui/react-separator',
      '@radix-ui/react-scroll-area',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      'ogl'
    ],
    // Permitir el uso de módulos nativos en Server Components (p.ej. better-sqlite3)
    serverComponentsExternalPackages: ['better-sqlite3'],
    // Habilitar optimizaciones experimentales
    // optimizeCss: true, // Deshabilitado temporalmente para evitar error de critters
    webVitalsAttribution: ['CLS', 'LCP', 'FCP', 'FID', 'TTFB', 'INP'],
  },
  
  // Configuración agresiva de webpack
  webpack: (config, { isServer, dev }) => {
    // Asegurar que better-sqlite3 se trate como dependencia externa en el bundle del servidor
    // para evitar que Webpack intente empaquetar el binario nativo.
    if (isServer) {
      const externals = config.externals || []
      config.externals = Array.isArray(externals)
        ? [...externals, 'better-sqlite3']
        : [externals, 'better-sqlite3']
    }

    // Configuración específica para Web Workers
    if (!isServer) {
      // Permitir importación de archivos .worker.ts como URLs
      config.module.rules.push({
        test: /\.worker\.(js|ts)$/,
        type: 'asset/resource',
        generator: {
          filename: 'static/workers/[name].[hash][ext]',
        },
      });
    }

    // Optimizaciones para reducir el bundle size
    config.optimization.sideEffects = false;
    
    if (!isServer && !dev) {
      // Separación agresiva de chunks
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          // Chunk separado para Three.js y librerías 3D
          threejs: {
            test: /[\\/]node_modules[\\/](three|@react-three|ogl)[\\/]/,
            name: 'threejs',
            chunks: 'all',
            priority: 30,
            reuseExistingChunk: true,
          },
          // Chunk separado para Framer Motion
          framerMotion: {
            test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
            name: 'framer-motion',
            chunks: 'all',
            priority: 25,
            reuseExistingChunk: true,
          },
          // Chunk separado para Radix UI
          radixUI: {
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            name: 'radix-ui',
            chunks: 'all',
            priority: 20,
            reuseExistingChunk: true,
          },
          // Chunk separado para React y React DOM
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react',
            chunks: 'all',
            priority: 40,
            reuseExistingChunk: true,
          },
          // Chunk para otras librerías vendor
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendor',
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
            minChunks: 2,
          },
        },
      };

      // Optimizaciones adicionales
      config.optimization.usedExports = true;
      config.optimization.providedExports = true;
      config.optimization.innerGraph = true;
      
      // Minimizar el número de chunks para HTTP/2
      config.optimization.splitChunks.maxAsyncRequests = 6;
      config.optimization.splitChunks.maxInitialRequests = 4;
    }

    // Alias para optimizar importaciones - removido el alias problemático
    // config.resolve.alias = {
    //   ...config.resolve.alias,
    //   // Usar versiones optimizadas cuando estén disponibles
    //   'framer-motion': dev ? 'framer-motion' : 'framer-motion/dist/framer-motion.js',
    // };

    // Ignorar archivos innecesarios para reducir el bundle
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    return config;
  },

  // Permanent redirects for legacy non-locale blog URLs (pre-[locale] routing,
  // Dec 2025). Legacy slugs ai-solutions / e2d-transformation / blog have no
  // matching MDX, so redirect to the ES blog index rather than /es/blog/:slug
  // which would just 404 again.
  async redirects() {
    return [
      {
        source: "/blog",
        destination: "/es/blog",
        permanent: true,
      },
      {
        source: "/blog/:slug*",
        destination: "/es/blog",
        permanent: true,
      },
    ]
  },
}

export default withBundleAnalyzer(withNextIntl(withContentlayer(nextConfig)))
