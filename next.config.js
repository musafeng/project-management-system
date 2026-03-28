/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // 允许 Server Action / Route Handler 接收最大 100MB 的请求体
    serverActionsBodySizeLimit: '100mb',
  },
};

module.exports = nextConfig;
