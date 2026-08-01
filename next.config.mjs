/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  turbopack: {
    root: new URL(".", import.meta.url).pathname,
  },

  async redirects() {
    return [
      {
        source: "/",
        has: [
          {
            type: "host",
            value: "mint.energon.app",
          },
        ],
        destination: "/mint",
        permanent: false,
      },
      {
        source: "/",
        has: [
          {
            type: "host",
            value: "dashboard.energon.app",
          },
        ],
        destination: "/dashboard",
        permanent: false,
      },
      {
        source: "/",
        has: [
          {
            type: "host",
            value: "observer.energon.app",
          },
        ],
        destination: "/observer",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;