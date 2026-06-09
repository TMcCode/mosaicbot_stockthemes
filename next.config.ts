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
const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  ...(isDev ? {} : { output: "export" }),
  async rewrites() {
    if (!isDev) return [];
    // Browser overlay chart sidecars fetch same-origin in dev (CDN CORS only whitelists :3000).
    return [
      {
        source: "/stockthemes-data/:path*",
        destination: "https://storage.stockthemes.ai/:path*",
      },
    ];
  },
  experimental: {
    // Turbopack FS cache can occasionally corrupt local `.next/dev` in this repo.
    // Keep prod behavior unchanged; this only affects `next dev`.
    turbopackFileSystemCacheForDev: false,
  },
  // Allow LAN-origin browser access to dev-only assets (e.g. HMR) while testing from another device.
  allowedDevOrigins: ["192.168.1.218"],
  ...(basePath ? { basePath } : {}),
  webpack: (config, { dev }) => {
    if (dev) {
      // Avoid filesystem rename races in `.next/dev/cache/webpack/*` on some local setups,
      // while still keeping fast rebuilds via in-memory caching.
      config.cache = { type: "memory" };
    }
    return config;
  },
  // Documents/ has a stray package-lock.json; without this, Turbopack uses the wrong root.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
