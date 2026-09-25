#!/usr/bin/env node
/**
 * Cloudflare custom domains 404 unencoded `~` in static asset paths
 * (pages.dev serves them fine; stockthemes.ai often 404s ~ CSS/JS URLs).
 * Turbopack emits chunk names with `~` — rename those files, rewrite every
 * chunk-path ref, then cache-bust any rewritten loaders whose filenames did
 * not change (same URL + CF HIT would otherwise keep stale tilde refs).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "out");
const TILDE = "~";
const SAFE = "_";
const BUST = "-st"; // stockthemes tilde-sanitize cache bust marker
/** Per-deploy salt so apex cannot keep a year-long 404 HIT on a reused -st hash. */
const DEPLOY_SALT = (
  process.env.GITHUB_SHA ||
  process.env.CF_PAGES_COMMIT_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  Date.now().toString(36)
)
  .replace(/[^a-zA-Z0-9]/g, "")
  .slice(0, 8)
  .toLowerCase();


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
  while (CHUNK_TILDE_RE.test(next) && guard < 32) {
    CHUNK_TILDE_RE.lastIndex = 0;
    next = next.replace(CHUNK_TILDE_RE, (_, a, b) => `${a}${SAFE}${b}`);
    guard += 1;
  }
  CHUNK_TILDE_RE.lastIndex = 0;
  return next;
}

function shortHash(filePath) {
  const h = crypto.createHash("sha1").update(fs.readFileSync(filePath)).digest("hex");
  return h.slice(0, 6);
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
  const rewrittenPaths = [];
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
      rewrittenPaths.push(file);
    }
  }

  // 3) Cache-bust JS/CSS under _next/static that we rewrote **or** tilde-renamed.
  // Custom domains can poison a year-long 404 HIT on a post-rename URL
  // (e.g. 0z6.vl98_g6o7.css) before the asset exists — skipping bust on
  // renamed files left Narrative Radar unstyled on stockthemes.ai while
  // pages.dev served the same path fine.
  const bustCandidates = new Set(rewrittenPaths);
  for (const { to } of renames) bustCandidates.add(to);
  const bustRenames = [];
  for (const file of bustCandidates) {
    const rel = path.relative(path.join(OUT, "_next", "static"), file);
    if (rel.startsWith("..")) continue;
    const ext = path.extname(file).toLowerCase();
    if (ext !== ".js" && ext !== ".css") continue;
    const base = path.basename(file, ext);
    if (base.includes(BUST)) continue;
    const dir = path.dirname(file);
    const toBase = `${base}${BUST}${shortHash(file)}${DEPLOY_SALT}${ext}`;
    const to = path.join(dir, toBase);
    if (fs.existsSync(to)) {
      console.error(`[sanitize-chunk-tildes] bust collision: ${to}`);
      process.exit(1);
    }
    bustRenames.push({
      from: file,
      to,
      fromBase: path.basename(file),
      toBase,
    });
  }
  bustRenames.sort((a, b) => b.fromBase.length - a.fromBase.length);
  for (const { from, to, fromBase, toBase } of bustRenames) {
    fs.renameSync(from, to);
    console.log(`[sanitize-chunk-tildes] cache-bust ${fromBase} → ${toBase}`);
  }

  if (bustRenames.length) {
    let bustRewritten = 0;
    for (const file of walk(OUT)) {
      if (!textExt.has(path.extname(file).toLowerCase())) continue;
      let body = fs.readFileSync(file, "utf8");
      let next = body;
      for (const { fromBase, toBase } of bustRenames) {
        if (next.includes(fromBase)) next = next.split(fromBase).join(toBase);
      }
      if (next !== body) {
        fs.writeFileSync(file, next);
        bustRewritten += 1;
      }
    }
    console.log(`[sanitize-chunk-tildes] rewrote ${bustRewritten} file(s) for cache-bust names`);
  }

  // 4) Fail closed: no ~ filenames, no ~ inside static/chunks/ string paths.
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
    `[sanitize-chunk-tildes] renamed ${renames.length} tilde file(s), rewrote ${rewrittenPaths.length}, cache-bust ${bustRenames.length} (salt=${DEPLOY_SALT})`,
  );
}

main();
