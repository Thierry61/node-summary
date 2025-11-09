/** @type {import('next').NextConfig} */
const nextConfig = {
    logging : {
        fetches: {
            fullUrl: true,
        },
    },
    experimental: {
        // Needed for development,
        // otherwise fetch requests to bitcoin server don't work
        serverComponentsHmrCache: false,
    },
}

export default nextConfig;
