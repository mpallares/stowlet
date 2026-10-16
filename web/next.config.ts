import type { NextConfig } from 'next';

// Fully static site: `next build` writes to web/out. No server, no database, no auth.
// Response headers cannot be set from here with `output: 'export'`; the CORS header
// the extension needs on /config/* lives in vercel.json.
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: false,
  images: { unoptimized: true },
};

export default nextConfig;
