/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // The codebase type-checks cleanly (verified via `tsc --noEmit`) — catch
    // regressions at build time instead of silently shipping them.
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: process.cwd(),
  },
}

export default nextConfig
