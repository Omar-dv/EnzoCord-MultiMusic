/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  experimental: {
    serverComponentsExternalPackages: [
      '@prisma/client',
      'prisma',
      'discord.js',
      '@discordjs/voice',
      'shoukaku',
      'kazagumo',
      'sodium-native',
      '@snazzah/davey',
      'bufferutil',
      'utf-8-validate',
      'zlib-sync',
      'erlpack',
    ],
  },
  transpilePackages: [
    '@enzocord/shared',
    '@enzocord/config',
    '@enzocord/database',
    '@enzocord/discord',
    '@enzocord/music',
    '@enzocord/services',
  ],
};

module.exports = nextConfig;
