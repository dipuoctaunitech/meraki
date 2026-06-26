/** @type {import('next').NextConfig} */
const backendImageHost = process.env.NEXT_PUBLIC_BACKEND_IMAGE_HOST ?? "";

/** @type {import('next').NextConfig['images']['remotePatterns']} */
const remotePatterns = [
  {
    protocol: "http",
    hostname: "localhost",
    port: "8000",
    pathname: "/static/**"
  },
  {
    protocol: "http",
    hostname: "127.0.0.1",
    port: "8000",
    pathname: "/static/**"
  },
  {
    protocol: "https",
    hostname: "images.unsplash.com",
    pathname: "/**"
  }
];

if (backendImageHost) {
  remotePatterns.push({
    protocol: "https",
    hostname: backendImageHost,
    pathname: "/static/**"
  });
}

const nextConfig = {
  output: "export",
  typedRoutes: true,
  allowedDevOrigins: ["192.168.1.6"],
  images: {
    remotePatterns
  }
};

module.exports = nextConfig;
