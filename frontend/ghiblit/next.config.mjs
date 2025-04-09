/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  images: {
    domains: ['your-render-app-name.onrender.com'],
    minimumCacheTTL: 3600, // Cache images for at least 1 hour
  },
  // Add caching strategies
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 4,
  },
  // Enable React Strict Mode for improved development
  reactStrictMode: true,
  // Cache the build output between builds
  experimental: {
    // This is experimental but can help with the build performance
    staticPageGenerationTimeout: 90,
  },
};
  
export default nextConfig;