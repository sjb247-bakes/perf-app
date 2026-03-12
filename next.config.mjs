/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // Exclude supabase edge functions from Next.js type checking
    // They use Deno imports which are incompatible with Node.js TypeScript
    ignoreBuildErrors: false,
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /supabase\/functions\/.*/,
      use: 'ignore-loader',
    });
    return config;
  },
};

export default nextConfig;
