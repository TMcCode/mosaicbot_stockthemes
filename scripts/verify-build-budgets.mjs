import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "out");
const enforce = process.env.STOCKTHEMES_ENFORCE_BUNDLE_BUDGET === "1";

const budgets = {
  homeHtml: 500_000,
  compareHtml: 500_000,
  maxThemeHtml: 200_000,
  maxGroupHtml: 350_000,
  initialJs: 750_000,
};

function size(file) {
  return fs.statSync(file).size;
}

function maxHtml(directory) {
  return fs
    .readdirSync(directory)
    .filter((name) => name.endsWith(".html") && name !== "index.html")
    .map((name) => ({ name, bytes: size(path.join(directory, name)) }))
    .sort((a, b) => b.bytes - a.bytes)[0];
}

function initialJsBytes(htmlFile) {
  const html = fs.readFileSync(htmlFile, "utf8");
  const matches = html.matchAll(/\/_next\/static\/chunks\/([^"?]+\.js)/g);
  const names = new Set(Array.from(matches, (match) => match[1]));
  return Array.from(names).reduce((total, name) => {
    const file = path.join(out, "_next", "static", "chunks", name);
    return total + (fs.existsSync(file) ? size(file) : 0);
  }, 0);
}

if (!fs.existsSync(out)) {
  console.error("verify-build-budgets: out/ is missing; run npm run build first");
  process.exit(1);
}

const largestTheme = maxHtml(path.join(out, "themes"));
const largestGroup = maxHtml(path.join(out, "groups"));
const actual = {
  homeHtml: size(path.join(out, "index.html")),
  compareHtml: size(path.join(out, "compare.html")),
  maxThemeHtml: largestTheme.bytes,
  maxGroupHtml: largestGroup.bytes,
  initialJs: initialJsBytes(path.join(out, "privacy.html")),
};

const failures = [];
for (const [key, limit] of Object.entries(budgets)) {
  const value = actual[key];
  const ok = value <= limit;
  console.log(
    `verify-build-budgets: ${key} ${(value / 1000).toFixed(1)} KB / ${(limit / 1000).toFixed(1)} KB ${ok ? "OK" : "OVER"}`,
  );
  if (!ok) failures.push(`${key}: ${value} > ${limit}`);
}
console.log(`verify-build-budgets: largest theme ${largestTheme.name}`);
console.log(`verify-build-budgets: largest group ${largestGroup.name}`);

if (failures.length && enforce) {
  console.error(`verify-build-budgets: failed\n${failures.join("\n")}`);
  process.exit(1);
}
if (failures.length) {
  console.warn("verify-build-budgets: over budget (report-only mode)");
} else if (!enforce) {
  console.log("verify-build-budgets: report-only mode; set STOCKTHEMES_ENFORCE_BUNDLE_BUDGET=1 to enforce");
}
