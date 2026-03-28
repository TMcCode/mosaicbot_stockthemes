import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "export",
  // Documents/ has a stray package-lock.json; without this, Turbopack uses the wrong root.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
