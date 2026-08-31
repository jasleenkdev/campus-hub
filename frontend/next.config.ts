import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root: without this, Next walks up and finds an unrelated
  // package-lock.json in the home directory.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
