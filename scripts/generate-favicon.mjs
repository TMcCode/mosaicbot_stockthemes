/**
 * Brand favicons from public/brand/logo-icon.svg → src/app/* and nav PNG.
 * Run via prebuild or: npm run icons:generate
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

import {
  generatedAssetHash,
  generatedAssetsCurrent,
  writeGeneratedAssetMarker,
} from "./lib/generatedAssetGate.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const svgPath = path.join(root, "public", "brand", "logo-icon.svg");
const appDir = path.join(root, "src", "app");
const navPngPath = path.join(root, "public", "brand", "logo-icon-custom.png");
const outputs = [
  path.join(appDir, "icon.png"),
  path.join(appDir, "apple-icon.png"),
  path.join(appDir, "favicon.ico"),
  navPngPath,
];
const markerPath = path.join(root, ".cache", "generated-assets", "favicons.sha256");

async function main() {
  if (!fs.existsSync(svgPath)) {
    console.error(`generate-favicon: missing ${svgPath}`);
    process.exit(1);
  }

  const inputHash = generatedAssetHash([scriptPath, svgPath], "favicons-v1");
  if (generatedAssetsCurrent({ markerPath, hash: inputHash, outputs })) {
    console.log("generate-favicon: inputs unchanged — skip");
    return;
  }

  const svg = fs.readFileSync(svgPath);

  const icon512 = await sharp(svg).resize(512, 512).png({ compressionLevel: 9 }).toBuffer();
  await sharp(icon512).toFile(path.join(appDir, "icon.png"));

  await sharp(svg).resize(180, 180).png({ compressionLevel: 9 }).toFile(path.join(appDir, "apple-icon.png"));

  const fav32 = await sharp(svg).resize(32, 32).png().toBuffer();
  await sharp(fav32).toFile(path.join(appDir, "favicon.ico"));

  // Nav mark @2x (displayed at 38×25 in SiteNav)
  await sharp(svg)
    .resize(152, 100, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(navPngPath);

  writeGeneratedAssetMarker(markerPath, inputHash);
  console.log("generate-favicon: wrote src/app/icon.png, apple-icon.png, favicon.ico");
  console.log(`generate-favicon: wrote ${navPngPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
