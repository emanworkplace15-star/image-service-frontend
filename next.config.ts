import type { NextConfig } from 'next';

// Static export: the frontend no longer runs as a container — CI builds
// static HTML/JS into ./out and syncs it to S3 behind CloudFront.
// (No SSR / route handlers are used, so this is a pure client-side app.)
const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true }, // no server to optimize images on
};

export default nextConfig;
