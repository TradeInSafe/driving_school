import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.193", "localhost:3000"],
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
