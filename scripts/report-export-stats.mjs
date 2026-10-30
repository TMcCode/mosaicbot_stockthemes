/**
 * Post-build export size/count report (Phase 5). Does not fail the build.
 * Run after `npm run build` — useful before enabling STOCKTHEMES_SYNC_STOCKS=1.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "out");

function walkFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walkFiles(p, acc);
    else acc.push(p);
  }
  return acc;
}

function dirHtmlStats(rel) {
  const dir = path.join(out, rel);
  if (!fs.existsSync(dir)) return { count: 0, bytes: 0, largest: null };
  const htmls = fs
    .readdirSync(dir)
    .filter((n) => n.endsWith(".html"))
    .map((n) => {
      const bytes = fs.statSync(path.join(dir, n)).size;
      return { name: n, bytes };
    })
    .sort((a, b) => b.bytes - a.bytes);
  return {
    count: htmls.length,
    bytes: htmls.reduce((s, h) => s + h.bytes, 0),
    largest: htmls[0] || null,
  };
}

if (!fs.existsSync(out)) {
  console.error("report-export-stats: out/ missing — run npm run build first");
  process.exit(1);
}

const allFiles = walkFiles(out);
const totalBytes = allFiles.reduce((s, f) => s + fs.statSync(f).size, 0);
const themes = dirHtmlStats("themes");
const groups = dirHtmlStats("groups");
const stocks = dirHtmlStats("stocks");

console.log(`report-export-stats: files=${allFiles.length} total=${(totalBytes / 1e6).toFixed(1)} MB`);
console.log(
  `report-export-stats: themes html=${themes.count} ${(themes.bytes / 1e6).toFixed(2)} MB` +
    (themes.largest
      ? ` largest=${themes.largest.name} ${(themes.largest.bytes / 1000).toFixed(1)} KB`
      : ""),
);
console.log(
  `report-export-stats: groups html=${groups.count} ${(groups.bytes / 1e6).toFixed(2)} MB` +
    (groups.largest
      ? ` largest=${groups.largest.name} ${(groups.largest.bytes / 1000).toFixed(1)} KB`
      : ""),
);
console.log(
  `report-export-stats: stocks html=${stocks.count} ${(stocks.bytes / 1e6).toFixed(2)} MB` +
    (stocks.largest
      ? ` largest=${stocks.largest.name} ${(stocks.largest.bytes / 1000).toFixed(1)} KB`
      : ""),
);

const warnFileLimit = Number(process.env.STOCKTHEMES_EXPORT_FILE_WARN || 18000);
if (allFiles.length >= warnFileLimit) {
  console.warn(
    `report-export-stats: file count ${allFiles.length} near CF Pages pressure (warn@${warnFileLimit}) — consider universe cap / Worker-split`,
  );
}
