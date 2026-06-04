import { fileURLToPath } from "url"
import path from "path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["10.10.51.62", "localhost"],
  turbopack: {
    root: __dirname,
  },
}

export default nextConfig
