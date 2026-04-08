/**
 * Writes public/og.png (1200×630) for Open Graph / Twitter / iMessage / WhatsApp previews.
 * Centers public/brand/logo-og-lockup.jpg (full wordmark + icon) on a light canvas that matches
 * the asset’s near-white edge (~#fafafa). File may be JPEG bytes with a .png name from export tools.
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outPath = path.join(root, "public", "og.png");
const lockupPath = path.join(root, "public", "brand", "logo-og-lockup.jpg");

const W = 1200;
const H = 630;
/** Matches baked-in light background of the lockup export (edge avg ~252,249,250). */
const BG = { r: 250, g: 248, b: 249 };
const MAX_LOCKUP_W = 1040;
const MAX_LOCKUP_H = 520;

async function main() {
  if (!fs.existsSync(lockupPath)) {
    console.error(`generate-og-png: missing ${lockupPath}`);
    process.exit(1);
  }

  const resizedBuf = await sharp(lockupPath)
    .resize(MAX_LOCKUP_W, MAX_LOCKUP_H, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .toBuffer();

  const meta = await sharp(resizedBuf).metadata();
  const lw = meta.width ?? 0;
  const lh = meta.height ?? 0;
  const left = Math.round((W - lw) / 2);
  const top = Math.round((H - lh) / 2);

  await sharp({
    create: {
      width: W,
      height: H,
      channels: 3,
      background: BG,
    },
  })
    .composite([{ input: resizedBuf, left, top }])
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  console.log(`generate-og-png: wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
