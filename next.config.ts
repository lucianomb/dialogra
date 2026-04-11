import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { remotePatterns: [
    { protocol: 'https', hostname: 'covers.openlibrary.org' },
    { protocol: 'https', hostname: '0wdbeggx2j0w7kep.public.blob.vercel-storage.com' },
  ]}
};

export default nextConfig;
