/**
 * Writes public/ads.txt for Google AdSense (required for site review / revenue).
 * Runs in prebuild; uses NEXT_PUBLIC_ADSENSE_CLIENT (ca-pub-…).
 * Static export cannot serve dynamic routes, so this file must exist in public/ at build time.
 */
import { existsSync, unlinkSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outPath = join(root, "public", "ads.txt");

/** Google’s authorized seller ID for google.com lines in ads.txt. */
const GOOGLE_CERT_ID = "f08c47fec0942fa0";

const client = (process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "").trim();

function removeIfExists() {
  try {
    if (existsSync(outPath)) unlinkSync(outPath);
  } catch {
    /* ignore */
  }
}

if (!client || !/^ca-pub-\d+$/i.test(client)) {
  removeIfExists();
  console.log(
    "write-ads-txt: NEXT_PUBLIC_ADSENSE_CLIENT missing or invalid; public/ads.txt not written (optional for local dev)."
  );
  process.exit(0);
}

const pub = client.replace(/^ca-/i, ""); // ca-pub-XXX -> pub-XXX
const body = `google.com, ${pub}, DIRECT, ${GOOGLE_CERT_ID}\n`;
writeFileSync(outPath, body, "utf8");
console.log("write-ads-txt: wrote public/ads.txt");
