import createNextIntlPlugin from 'next-intl/plugin'
import { withContentlayer } from 'next-contentlayer2'
import bundleAnalyzer from '@next/bundle-analyzer'

const withNextIntl = createNextIntlPlugin('./i18n.ts')
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
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
    // Habilitar optimizaciones experimentales
    // optimizeCss: true, // Deshabilitado temporalmente para evitar error de critters
    webVitalsAttribution: ['CLS', 'LCP', 'FCP', 'FID', 'TTFB', 'INP'],
  },
  
  // Configuración agresiva de webpack
  webpack: (config, { isServer, dev }) => {
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
}

export default withBundleAnalyzer(withNextIntl(withContentlayer(nextConfig)))
