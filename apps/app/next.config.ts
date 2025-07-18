// next.config.ts
import type { NextConfig } from 'next'

const backend = process.env.BACKEND_URL ?? 'http://localhost:8000'

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // 1) Don’t proxy any /api/llm/*—let Next.js handle those for streaming.
      {
        source: '/api/llm/:path*',
        destination: '/api/llm/:path*',
      },
      // 2) Proxy everything else under /api/**
      {
        source: '/api/:path*',
        destination: `${backend}/:path*`,
      },
    ]
  },
}

export default nextConfig