import crypto from "crypto";
import fs from "fs";
import path from "path";

export function generatedAssetHash(files, salt = "") {
  const hash = crypto.createHash("sha256");
  hash.update(salt);
  for (const file of files) {
    hash.update(path.resolve(file));
    hash.update(fs.readFileSync(file));
  }
  return hash.digest("hex");
}

export function generatedAssetsCurrent({ markerPath, hash, outputs }) {
  if (!outputs.every((output) => fs.existsSync(output))) return false;
  try {
    return fs.readFileSync(markerPath, "utf8").trim() === hash;
  } catch {
    return false;
  }
}

export function writeGeneratedAssetMarker(markerPath, hash) {
  fs.mkdirSync(path.dirname(markerPath), { recursive: true });
  fs.writeFileSync(markerPath, `${hash}\n`);
}
