import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.doggy.market",
        port: "",
        pathname: "",
        search: "",
      },
    ],
  },
  env: {
    BELINDEX_API_BASE: process.env.BELINDEX_API_BASE,
    ORD_API_BASE: process.env.ORD_API_BASE,
    NEXT_PUBLIC_ORD_API_BASE: process.env.NEXT_PUBLIC_ORD_API_BASE,
  },
};

export default nextConfig;
