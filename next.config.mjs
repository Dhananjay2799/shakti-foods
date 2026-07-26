/** @type {import('next').NextConfig} */
const nextConfig = { 
  images: { 
    formats: ['image/avif', 'image/webp'] 
  },
  
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb"
    }
  }
};

export default nextConfig;