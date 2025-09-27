import createNextIntlPlugin from 'next-intl/plugin'
import { withContentlayer } from 'next-contentlayer2'

const withNextIntl = createNextIntlPlugin('./i18n.ts')

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
}

export default withNextIntl(withContentlayer(nextConfig))
