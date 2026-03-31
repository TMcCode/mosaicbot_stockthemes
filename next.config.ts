import type { NextConfig } from "next";
import path from "path";

/**
 * GitHub project Pages serves at https://<user>.github.io/<repo>/ — set
 * NEXT_PUBLIC_BASE_PATH=/<repo> in CI (e.g. /mosaicbot_stockthemes). Omit for apex
 * custom domain (https://stockthemes.ai/).
 */
let basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").trim().replace(/\/$/, "");
if (basePath && !basePath.startsWith("/")) {
  basePath = `/${basePath}`;
}

const nextConfig: NextConfig = {
  output: "export",
  // Allow LAN-origin browser access to dev-only assets (e.g. HMR) while testing from another device.
  allowedDevOrigins: ["192.168.1.218"],
  ...(basePath ? { basePath } : {}),
  // Documents/ has a stray package-lock.json; without this, Turbopack uses the wrong root.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
