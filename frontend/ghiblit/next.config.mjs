/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  images: {
    domains: ['ghiblit-backend.onrender.com'],
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
  // Experimental features
  experimental: {
    // Remove the invalid staticPageGenerationTimeout property
  },
};
  
export default nextConfig;