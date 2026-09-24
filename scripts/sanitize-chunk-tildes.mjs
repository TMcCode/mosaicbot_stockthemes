#!/usr/bin/env node
/**
 * Cloudflare custom domains 404 unencoded `~` in static asset paths
 * (pages.dev serves them fine; stockthemes.ai returns HTML 404).
 * Turbopack sometimes emits chunk names with `~` — rename + rewrite refs.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "out");
const TILDE = "~";
const SAFE = "_";

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, files);
    else files.push(p);
  }
  return files;
}

function main() {
  if (!fs.existsSync(OUT)) {
    console.error("[sanitize-chunk-tildes] missing out/");
    process.exit(1);
  }

  const all = walk(OUT);
  const tildeFiles = all.filter((f) => path.basename(f).includes(TILDE));
  if (tildeFiles.length === 0) {
    console.log("[sanitize-chunk-tildes] no ~ filenames; ok");
    return;
  }

  const renames = [];
  for (const from of tildeFiles) {
    const base = path.basename(from);
    const dir = path.dirname(from);
    const toBase = base.split(TILDE).join(SAFE);
    const to = path.join(dir, toBase);
    if (fs.existsSync(to)) {
      console.error(`[sanitize-chunk-tildes] collision: ${to}`);
      process.exit(1);
    }
    renames.push({ from, to, fromBase: base, toBase });
  }

  // Longest basenames first so partial replacements are less likely to clash mid-pass
  renames.sort((a, b) => b.fromBase.length - a.fromBase.length);

  for (const { from, to, fromBase, toBase } of renames) {
    fs.renameSync(from, to);
    console.log(`[sanitize-chunk-tildes] rename ${fromBase} → ${toBase}`);
  }

  const textExt = new Set([
    ".html",
    ".js",
    ".css",
    ".json",
    ".txt",
    ".map",
    ".xml",
    ".svg",
  ]);
  let rewritten = 0;
  for (const file of walk(OUT)) {
    if (!textExt.has(path.extname(file).toLowerCase())) continue;
    let body = fs.readFileSync(file, "utf8");
    let next = body;
    for (const { fromBase, toBase } of renames) {
      if (next.includes(fromBase)) {
        next = next.split(fromBase).join(toBase);
      }
    }
    if (next !== body) {
      fs.writeFileSync(file, next);
      rewritten += 1;
    }
  }

  // Fail closed if any ~ filenames or refs remain in HTML/JS link targets
  const leftover = walk(OUT).filter((f) => path.basename(f).includes(TILDE));
  if (leftover.length) {
    console.error("[sanitize-chunk-tildes] leftover ~ files:", leftover);
    process.exit(1);
  }

  console.log(
    `[sanitize-chunk-tildes] renamed ${renames.length} file(s), rewrote ${rewritten} ref file(s)`,
  );
}

main();
