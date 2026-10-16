/**
 * Bake Field of Themes (Beehiiv API) + Alt Data Observer (Substack RSS)
 * → public/fixtures/newsletter_posts.v0.json (+ optional R2 upload).
 *
 * Env:
 *   BEEHIIV_API_KEY, BEEHIIV_PUBLICATION_ID
 *   STOCKTHEMES_NEWSLETTER_SUBSTACK_FEED (default Alt Data Observer feed)
 *   STOCKTHEMES_PUBLIC_BUCKET + R2_* to upload newsletter_posts.v0.json
 *
 * Usage: node scripts/bake_newsletter_posts.mjs
 * CI: `.github/workflows/bake-newsletter.yml` (every 6h) + deploy-pages pre-build step.
 *
 * Substack often 403s Node fetch from GitHub Actions IPs; we retry with curl
 * (better TLS fingerprint). When STOCKTHEMES_PUBLIC_BUCKET is set, empty Substack
 * or failed R2 upload exits non-zero so the schedule cannot silently go stale.
 */
import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";

import { downloadR2Object, uploadR2Object } from "./lib/r2Download.mjs";

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const OUT_REL = "newsletter_posts.v0.json";
const FIXTURE = path.join(root, "public", "fixtures", OUT_REL);

const DEFAULT_SUBSTACK_FEED = "https://altadataobserver.substack.com/feed";
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const RSS_ACCEPT = "application/rss+xml, application/xml, text/xml, */*";

function loadDotEnvLocal() {
  const p = path.join(root, ".env.local");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env) || !String(process.env[k] || "").trim()) {
      process.env[k] = v;
    }
  }
}

function isoFromUnix(sec) {
  const n = Number(sec);
  if (!Number.isFinite(n) || n <= 0) return null;
  // Beehiiv may send seconds or ms
  const ms = n > 1e12 ? n : n * 1000;
  try {
    return new Date(ms).toISOString();
  } catch {
    return null;
  }
}

function isoFromRssDate(raw) {
  if (!raw) return null;
  const d = new Date(String(raw));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function decodeXml(s) {
  return String(s || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8212;/g, "—")
    .replace(/&#(\d+);/g, (_, n) => {
      const c = Number(n);
      return Number.isFinite(c) ? String.fromCodePoint(c) : "";
    })
    .trim();
}

function stripHtml(s) {
  return decodeXml(s)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Prefer a real RSS description/subtitle; else first paragraph from content:encoded. */
function previewFromRssItem(block) {
  const descM = block.match(/<description>([\s\S]*?)<\/description>/i);
  const desc = stripHtml(descM?.[1] || "");
  const descOk =
    !!desc &&
    desc.length >= 24 &&
    !/^\d{1,2}\/\d{1,2}\s+Issue$/i.test(desc);

  if (descOk) return desc.slice(0, 220);

  const encodedM = block.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/i);
  const html = encodedM ? decodeXml(encodedM[1]) : "";
  if (html) {
    const paras = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((m) =>
      stripHtml(m[1]),
    );
    for (const p of paras) {
      if (p.length < 40) continue;
      if (/subscribe for free|thanks for reading|type your email/i.test(p)) continue;
      return p.slice(0, 220);
    }
    const plain = stripHtml(html);
    if (plain.length >= 40) return plain.slice(0, 220);
  }
  return null;
}

function imageFromRssItem(block) {
  const enc = block.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*>/i);
  if (enc?.[1] && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(enc[1])) {
    return decodeXml(enc[1]);
  }
  if (enc?.[1] && /substackcdn\.com|substack-post-media/i.test(enc[1])) {
    return decodeXml(enc[1]);
  }
  const media = block.match(/<media:content[^>]*url=["']([^"']+)["'][^>]*>/i);
  if (media?.[1]) return decodeXml(media[1]);
  const encodedM = block.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/i);
  const html = encodedM ? decodeXml(encodedM[1]) : "";
  const img = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (img?.[1] && /^https?:\/\//i.test(img[1])) return img[1];
  return null;
}

async function fetchBeehiivPosts() {
  const key = String(process.env.BEEHIIV_API_KEY || "").trim();
  const pub = String(process.env.BEEHIIV_PUBLICATION_ID || "").trim();
  if (!key || !pub) {
    console.warn("  Beehiiv skipped: BEEHIIV_API_KEY / BEEHIIV_PUBLICATION_ID unset");
    return [];
  }
  const out = [];
  let page = 1;
  for (;;) {
    const url = new URL(
      `https://api.beehiiv.com/v2/publications/${encodeURIComponent(pub)}/posts`,
    );
    url.searchParams.set("status", "confirmed");
    url.searchParams.set("limit", "50");
    url.searchParams.set("page", String(page));
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`Beehiiv posts HTTP ${res.status}`);
    }
    const data = await res.json();
    const rows = Array.isArray(data?.data) ? data.data : [];
    for (const p of rows) {
      if (!p || p.hidden_from_feed) continue;
      const title = String(p.title || p.subject_line || "").trim();
      const href = String(p.web_url || "").trim();
      if (!title || !href) continue;
      const published =
        isoFromUnix(p.publish_date) ||
        isoFromUnix(p.displayed_date) ||
        isoFromUnix(p.created);
      out.push({
        id: `beehiiv:${p.id || p.slug || href}`,
        source: "beehiiv",
        source_label: "Field of Themes",
        title,
        url: href,
        published_at: published,
        subtitle: String(p.subtitle || p.preview_text || "").trim() || null,
        image_url: String(p.thumbnail_url || "").trim() || null,
      });
    }
    const totalPages = Number(data?.total_pages || data?.page?.total_pages || 1);
    if (page >= totalPages || rows.length === 0) break;
    page += 1;
    if (page > 20) break;
  }
  return out;
}

async function fetchTextViaCurl(url) {
  const { stdout, stderr } = await execFileAsync(
    "curl",
    [
      "-sL",
      "--fail",
      "--max-time",
      "30",
      "-A",
      BROWSER_UA,
      "-H",
      `Accept: ${RSS_ACCEPT}`,
      url,
    ],
    { maxBuffer: 12 * 1024 * 1024, encoding: "utf8" },
  );
  if (!stdout || /just a moment/i.test(stdout.slice(0, 500))) {
    throw new Error(`curl returned challenge/empty${stderr ? `: ${stderr.slice(0, 120)}` : ""}`);
  }
  return stdout;
}

async function fetchSubstackXml(feedUrl) {
  const headers = {
    Accept: RSS_ACCEPT,
    "User-Agent": BROWSER_UA,
  };
  let fetchErr = null;
  try {
    const res = await fetch(feedUrl, { headers });
    if (res.ok) {
      const xml = await res.text();
      if (xml && !/just a moment/i.test(xml.slice(0, 500))) return xml;
      fetchErr = new Error("Substack returned Cloudflare challenge HTML");
    } else {
      fetchErr = new Error(`Substack feed HTTP ${res.status}`);
    }
  } catch (err) {
    fetchErr = err instanceof Error ? err : new Error(String(err));
  }
  // GHA / Cloudflare often blocks Node fetch TLS fingerprint; curl usually works.
  console.warn(`  Substack fetch retry via curl (${fetchErr.message})`);
  return fetchTextViaCurl(feedUrl);
}

async function fetchSubstackFeed(feedUrl) {
  const xml = await fetchSubstackXml(feedUrl);
  const items = [];
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
  for (const block of blocks) {
    const titleM = block.match(/<title>([\s\S]*?)<\/title>/i);
    const linkM = block.match(/<link>([\s\S]*?)<\/link>/i);
    const dateM = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
    const title = decodeXml(titleM?.[1] || "");
    const href = decodeXml(linkM?.[1] || "");
    if (!title || !href) continue;
    items.push({
      id: `substack:${href}`,
      source: "substack",
      source_label: "Alt Data Observer",
      title,
      url: href,
      published_at: isoFromRssDate(decodeXml(dateM?.[1] || "")),
      subtitle: previewFromRssItem(block),
      image_url: imageFromRssItem(block),
    });
  }
  return items;
}

function sortPosts(posts) {
  return [...posts].sort((a, b) => {
    const ta = a.published_at ? Date.parse(a.published_at) : 0;
    const tb = b.published_at ? Date.parse(b.published_at) : 0;
    return tb - ta;
  });
}

function requireR2Upload() {
  return Boolean(String(process.env.STOCKTHEMES_PUBLIC_BUCKET || "").trim());
}

async function loadPreviousPosts() {
  try {
    const raw = await downloadR2Object(OUT_REL);
    const data = JSON.parse(raw);
    if (Array.isArray(data?.posts)) return data.posts;
  } catch (err) {
    console.warn(`  Previous R2 posts unavailable: ${err?.message || err}`);
  }
  try {
    if (fs.existsSync(FIXTURE)) {
      const data = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
      if (Array.isArray(data?.posts)) return data.posts;
    }
  } catch {
    /* ignore */
  }
  return [];
}

function mergePosts(beehiiv, substack, previous) {
  const keptBeehiiv = beehiiv.length
    ? beehiiv
    : previous.filter((p) => p?.source === "beehiiv");
  const keptSubstack = substack.length
    ? substack
    : previous.filter((p) => p?.source === "substack");
  if (!beehiiv.length && keptBeehiiv.length) {
    console.warn(`  Beehiiv empty; kept ${keptBeehiiv.length} prior Beehiiv post(s)`);
  }
  return sortPosts([...keptBeehiiv, ...keptSubstack]).slice(0, 40);
}

async function maybeUploadR2(body) {
  const bucket = String(process.env.STOCKTHEMES_PUBLIC_BUCKET || "").trim();
  if (!bucket) {
    console.log("  R2 upload skipped (STOCKTHEMES_PUBLIC_BUCKET unset)");
    return false;
  }
  const endpoint = String(process.env.R2_ENDPOINT_URL || "").trim();
  const accessKeyId = String(process.env.R2_ACCESS_KEY_ID || "").trim();
  const secretAccessKey = String(process.env.R2_SECRET_ACCESS_KEY || "").trim();
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("R2_* unset but STOCKTHEMES_PUBLIC_BUCKET is set");
  }
  await uploadR2Object(OUT_REL, body, {
    contentType: "application/json",
    cacheControl: "public, max-age=300",
  });
  console.log(`  Uploaded r2://${bucket}/${OUT_REL}`);
  return true;
}

async function main() {
  loadDotEnvLocal();
  const substackFeed =
    String(process.env.STOCKTHEMES_NEWSLETTER_SUBSTACK_FEED || "").trim() ||
    DEFAULT_SUBSTACK_FEED;
  const mustUpload = requireR2Upload();

  console.log("Baking newsletter_posts.v0.json …");
  const [beehiiv, substack] = await Promise.all([
    fetchBeehiivPosts().catch((err) => {
      console.warn(`  Beehiiv skipped: ${err?.message || err}`);
      return [];
    }),
    fetchSubstackFeed(substackFeed).catch((err) => {
      console.warn(`  Substack skipped: ${err?.message || err}`);
      return [];
    }),
  ]);
  console.log(`  Beehiiv: ${beehiiv.length}  Substack: ${substack.length}`);

  if (substack.length === 0) {
    const msg =
      "Substack returned 0 posts (feed blocked or empty). Desk will go stale until this succeeds.";
    if (mustUpload) {
      console.error(`  ${msg}`);
      process.exit(1);
    }
    console.warn(`  ${msg}`);
  }

  const previous = beehiiv.length === 0 || substack.length === 0 ? await loadPreviousPosts() : [];
  const posts = mergePosts(beehiiv, substack, previous);
  if (posts.length === 0) {
    if (mustUpload) {
      console.error("  No posts to publish");
      process.exit(1);
    }
    console.warn("  No fresh posts; keeping existing fixture if present and exiting 0");
    if (fs.existsSync(FIXTURE)) {
      console.log(`  Left ${path.relative(root, FIXTURE)} unchanged`);
      return;
    }
  }

  const payload = {
    schema_version: 0,
    as_of: new Date().toISOString(),
    sources: {
      beehiiv: "Field of Themes",
      substack: "Alt Data Observer",
      substack_feed: substackFeed,
    },
    posts,
  };
  const body = `${JSON.stringify(payload, null, 2)}\n`;
  fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
  fs.writeFileSync(FIXTURE, body, "utf8");
  console.log(`  Wrote ${path.relative(root, FIXTURE)} (${posts.length} posts)`);
  await maybeUploadR2(body);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
