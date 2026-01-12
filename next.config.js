/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Skip SSL verification for Google Fonts during build (only for development)
  ...(process.env.NODE_ENV === 'development' && {
    serverRuntimeConfig: {
      // Allow self-signed certificates
    },
  }),
}

module.exports = nextConfig



