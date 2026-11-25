/** @type {import('next').NextConfig} */
const nextConfig = { 
  images: { 
    formats: ['image/avif', 'image/webp'] 
  },
  
  // /favicon.ico on the Simpli Ecoware website: its own icon, not
  // Shakti Foods' (public/favicon.ico).
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/favicon.ico",
          has: [{ type: "host", value: "(www\\.)?simpliecoware\\.(com|vercel\\.app)" }],
          destination: "/icons/ecoware-favicon.ico"
        }
      ]
    };
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "10mb"
    }
  }
};

export default nextConfig;