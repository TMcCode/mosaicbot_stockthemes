/**
 * After a successful static export, record manifest.as_of so scheduled CI can skip rebuilds.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const CACHE_DIR = path.join(root, ".cache", "stockthemes-public");
const META_PATH = path.join(CACHE_DIR, "_pages_deploy_meta.json");
const MANIFEST_CACHE = path.join(CACHE_DIR, "manifest.json");

function main() {
  let asOf = "";
  let buildId = "";
  try {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_CACHE, "utf8"));
    asOf = String(manifest.as_of || "");
    buildId = String(manifest.build_id || "");
  } catch {
    console.warn("write-pages-deploy-meta: no cached manifest.json");
  }

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(
    META_PATH,
    JSON.stringify(
      {
        as_of: asOf,
        build_id: buildId,
        deployed_at: new Date().toISOString(),
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log(`write-pages-deploy-meta: as_of=${asOf}`);
}

main();
