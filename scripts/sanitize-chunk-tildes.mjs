#!/usr/bin/env node
/**
 * Cloudflare custom domains 404 unencoded `~` in static asset paths
 * (pages.dev serves them fine; stockthemes.ai returns HTML 404 for many ~ CSS/JS URLs).
 * Turbopack emits chunk names with `~` — rename files and rewrite every chunk-path ref.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "out");
const TILDE = "~";
const SAFE = "_";

/** Match chunk/asset paths that still contain `~` (may appear more than once). */
const CHUNK_TILDE_RE = /(static\/chunks\/[^"'\\\s]*?)~([^"'\\\s]*)/g;

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

function sanitizeChunkPathRefs(body) {
  let next = body;
  let guard = 0;
  // Repeat: a path may contain multiple tildes.
  while (CHUNK_TILDE_RE.test(next) && guard < 32) {
    CHUNK_TILDE_RE.lastIndex = 0;
    next = next.replace(CHUNK_TILDE_RE, (_, a, b) => `${a}${SAFE}${b}`);
    guard += 1;
  }
  CHUNK_TILDE_RE.lastIndex = 0;
  return next;
}

function main() {
  if (!fs.existsSync(OUT)) {
    console.error("[sanitize-chunk-tildes] missing out/");
    process.exit(1);
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

  // 1) Rename any on-disk assets whose basename contains `~`.
  const tildeFiles = walk(OUT).filter((f) => path.basename(f).includes(TILDE));
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
  renames.sort((a, b) => b.fromBase.length - a.fromBase.length);
  for (const { from, to, fromBase, toBase } of renames) {
    fs.renameSync(from, to);
    console.log(`[sanitize-chunk-tildes] rename ${fromBase} → ${toBase}`);
  }

  // 2) Rewrite every text asset: exact rename pairs + any leftover chunk-path tildes.
  let rewritten = 0;
  for (const file of walk(OUT)) {
    if (!textExt.has(path.extname(file).toLowerCase())) continue;
    const body = fs.readFileSync(file, "utf8");
    let next = body;
    for (const { fromBase, toBase } of renames) {
      if (next.includes(fromBase)) next = next.split(fromBase).join(toBase);
    }
    next = sanitizeChunkPathRefs(next);
    if (next !== body) {
      fs.writeFileSync(file, next);
      rewritten += 1;
    }
  }

  // 3) Fail closed: no ~ filenames, no ~ inside static/chunks/ string paths.
  const leftoverFiles = walk(OUT).filter((f) => path.basename(f).includes(TILDE));
  if (leftoverFiles.length) {
    console.error("[sanitize-chunk-tildes] leftover ~ files:", leftoverFiles);
    process.exit(1);
  }

  const leftoverRefs = [];
  for (const file of walk(OUT)) {
    if (!textExt.has(path.extname(file).toLowerCase())) continue;
    const body = fs.readFileSync(file, "utf8");
    CHUNK_TILDE_RE.lastIndex = 0;
    if (CHUNK_TILDE_RE.test(body)) {
      leftoverRefs.push(path.relative(OUT, file));
    }
  }
  if (leftoverRefs.length) {
    console.error(
      "[sanitize-chunk-tildes] leftover static/chunks/~ refs in:",
      leftoverRefs.slice(0, 20),
    );
    process.exit(1);
  }

  console.log(
    `[sanitize-chunk-tildes] renamed ${renames.length} file(s), rewrote ${rewritten} ref file(s)`,
  );
}

main();
