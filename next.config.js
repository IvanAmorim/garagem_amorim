/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow access from network IP in development (prevents HMR crash when not using localhost)
  allowedDevOrigins: ["10.10.51.62", "localhost"],
}

export default nextConfig
