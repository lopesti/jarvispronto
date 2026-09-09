/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'http://api:3000/api/:path*',
            },
            {
                source: '/auth/:path*',
                destination: 'http://api:3000/auth/:path*',
            },
            {
                source: '/qr/:path*',
                destination: 'http://api:3000/qr/:path*',
            },
        ];
    },
};

module.exports = nextConfig;
