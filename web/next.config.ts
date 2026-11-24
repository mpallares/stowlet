import type { NextConfig } from 'next';

// Pages are prerendered; the routes under /api (Paddle webhook, license check, billing portal)
// run on the server, so this is no longer a static export. The CORS header the extension
// needs on /config/* lives in vercel.json.
const nextConfig: NextConfig = {
  trailingSlash: false,
  images: { unoptimized: true },
};

export default nextConfig;
