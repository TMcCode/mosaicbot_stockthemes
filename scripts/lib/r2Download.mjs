/**
 * Authenticated reads from Cloudflare R2 (CI / local prebuild).
 *
 * Preferred env:
 *   R2_ENDPOINT_URL, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
 *
 * One-cycle credential compatibility aliases are also accepted:
 *   r2_endpoint, r2_access_key_ID, r2_secret_access_key,
 *   S3_ENDPOINT_API, S3_endpoint_API.
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";

import { MOSAIC_THEMES_BUCKET, STOCKTHEMES_PUBLIC_BUCKET } from "./storageConfig.mjs";

const DEFAULT_BUCKET = STOCKTHEMES_PUBLIC_BUCKET;
export const APP_PRIVATE_PREFIX = "stockthemes_app";
const REGION = "auto";
const SERVICE = "s3";
let localEnvLoaded = false;

function loadLocalEnv() {
  if (localEnvLoaded) return;
  localEnvLoaded = true;
  const roots = [process.cwd(), path.join(process.cwd(), "..")];
  for (const root of roots) {
    for (const name of [".env.local", ".env"]) {
      const p = path.join(root, name);
      if (!fs.existsSync(p)) continue;
      const raw = fs.readFileSync(p, "utf8");
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
        const [key, ...rest] = trimmed.split("=");
        const value = rest.join("=").trim().replace(/^["']|["']$/g, "");
        if (key && process.env[key] === undefined) {
          process.env[key] = value;
        }
      }
    }
  }
}

function env(...names) {
  loadLocalEnv();
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value.replace(/^["']|["']$/g, "");
  }
  return "";
}

function r2Config() {
  const endpoint = env("R2_ENDPOINT_URL", "S3_ENDPOINT_API", "S3_endpoint_API", "r2_endpoint");
  const accessKeyId = env("R2_ACCESS_KEY_ID", "AWS_ACCESS_KEY_ID", "r2_access_key_ID");
  const secretAccessKey = env("R2_SECRET_ACCESS_KEY", "AWS_SECRET_ACCESS_KEY", "r2_secret_access_key");
  const bucket = DEFAULT_BUCKET;
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 credentials missing: set R2_ENDPOINT_URL, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY");
  }
  return { endpoint: endpoint.replace(/\/$/, ""), accessKeyId, secretAccessKey, bucket };
}

function hmac(key, data, encoding) {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest(encoding);
}

function sha256(data, encoding = "hex") {
  return crypto.createHash("sha256").update(data).digest(encoding);
}

function signingKey(secretAccessKey, dateStamp) {
  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, REGION);
  const kService = hmac(kRegion, SERVICE);
  return hmac(kService, "aws4_request");
}

function encodeKey(key) {
  return key
    .replace(/^\/+/, "")
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function signedRequest(method, objectPath, { body, contentType, cacheControl, bucket } = {}) {
  const cfg = r2Config();
  const bucketName = (bucket || cfg.bucket || "").trim() || cfg.bucket;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const endpoint = new URL(cfg.endpoint);
  const pathname = `/${encodeURIComponent(bucketName)}/${encodeKey(objectPath)}`;
  const url = `${endpoint.origin}${pathname}`;
  const host = endpoint.host;
  const payloadBuf =
    body == null ? null : Buffer.isBuffer(body) ? body : Buffer.from(body);
  const payloadHash = payloadBuf ? sha256(payloadBuf) : "UNSIGNED-PAYLOAD";

  /** @type {Array<[string, string]>} */
  const headerPairs = [
    ["host", host],
    ["x-amz-content-sha256", payloadHash],
    ["x-amz-date", amzDate],
  ];
  if (contentType) headerPairs.push(["content-type", contentType]);
  if (cacheControl) headerPairs.push(["cache-control", cacheControl]);
  headerPairs.sort((a, b) => a[0].localeCompare(b[0]));

  const canonicalHeaders = `${headerPairs.map(([k, v]) => `${k}:${v}`).join("\n")}\n`;
  const signedHeaders = headerPairs.map(([k]) => k).join(";");
  const canonicalRequest = [
    method,
    pathname,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join("\n");
  const signature = hmac(signingKey(cfg.secretAccessKey, dateStamp), stringToSign, "hex");

  /** @type {Record<string, string>} */
  const headers = {
    Authorization:
      `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  if (contentType) headers["Content-Type"] = contentType;
  if (cacheControl) headers["Cache-Control"] = cacheControl;

  return {
    url,
    bucket: bucketName,
    headers,
  };
}

function formatFetchError(label, err) {
  const base = err instanceof Error ? err.message : String(err);
  const cause = err instanceof Error && err.cause ? err.cause : null;
  const code =
    cause && typeof cause === "object" && "code" in cause ? String(cause.code) : "";
  const extra = code ? ` (${code})` : "";
  return `${label}: ${base}${extra}`;
}

const RETRYABLE = new Set([
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_SOCKET",
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "EAI_AGAIN",
  "ENOTFOUND",
]);

function isRetryableFetchError(err) {
  if (!(err instanceof Error)) return false;
  const cause = err.cause;
  if (cause && typeof cause === "object" && "code" in cause && RETRYABLE.has(String(cause.code))) {
    return true;
  }
  const msg = err.message;
  return (
    msg.includes("fetch failed") ||
    msg.includes("Connect Timeout") ||
    msg.includes("network")
  );
}

function retryDelayMs(attempt) {
  return Math.min(8000, 400 * 2 ** attempt);
}

async function fetchWithRetry(url, init, { label = "R2 fetch" } = {}) {
  const maxAttempts = Number(process.env.R2_FETCH_MAX_ATTEMPTS || 4);
  let lastErr;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await fetch(url, init);
    } catch (err) {
      lastErr = err;
      if (!isRetryableFetchError(err) || attempt >= maxAttempts - 1) {
        throw err;
      }
      const wait = retryDelayMs(attempt);
      console.warn(
        `${label}: retry ${attempt + 2}/${maxAttempts} after ${wait}ms (${err instanceof Error ? err.message : err})`,
      );
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

export function r2SyncEnabled() {
  loadLocalEnv();
  if (process.env.STOCKTHEMES_SYNC_VIA_R2 === "1") return true;
  return process.env.STOCKTHEMES_SYNC_VIA_GCS === "1" && Boolean(env("R2_ENDPOINT_URL", "r2_endpoint"));
}

export function loadR2Credentials() {
  try {
    return r2Config();
  } catch {
    return null;
  }
}

export async function downloadR2Object(objectPath, { bucket } = {}) {
  const req = signedRequest("GET", objectPath, { bucket });
  let res;
  try {
    res = await fetchWithRetry(req.url, { headers: req.headers }, {
      label: `R2 GET s3://${req.bucket}/${objectPath}`,
    });
  } catch (err) {
    throw new Error(formatFetchError(`R2 download fetch failed for s3://${req.bucket}/${objectPath}`, err));
  }
  if (!res.ok) {
    throw new Error(`R2 ${res.status} s3://${req.bucket}/${objectPath}`);
  }
  return res.text();
}

/** Tier B app sidecar from private mosaic-themes (stockthemes_app/themes/…). */
export async function downloadPrivateThemeApp(slug) {
  const key = `${APP_PRIVATE_PREFIX}/themes/${slug}.app.v0.json`;
  return downloadR2Object(key, { bucket: MOSAIC_THEMES_BUCKET });
}

export async function r2ObjectMetadata(objectPath) {
  const req = signedRequest("HEAD", objectPath);
  const res = await fetchWithRetry(
    req.url,
    { method: "HEAD", headers: req.headers },
    { label: `R2 HEAD s3://${req.bucket}/${objectPath}` },
  );
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`R2 metadata ${res.status} s3://${req.bucket}/${objectPath}`);
  }
  const etag = (res.headers.get("etag") || "").replace(/^"|"$/g, "");
  return {
    etag: etag || undefined,
    lastModified: res.headers.get("last-modified") || undefined,
  };
}

/**
 * PUT an object to stockthemes-public (SigV4; no @aws-sdk dependency).
 * @param {string} objectPath
 * @param {string | Buffer | Uint8Array} body
 * @param {{ contentType?: string, cacheControl?: string }} [opts]
 */
export async function uploadR2Object(objectPath, body, opts = {}) {
  const contentType = opts.contentType || "application/octet-stream";
  const cacheControl = opts.cacheControl;
  const payload = Buffer.isBuffer(body)
    ? body
    : Buffer.from(body);
  const req = signedRequest("PUT", objectPath, {
    body: payload,
    contentType,
    cacheControl,
  });
  let res;
  try {
    res = await fetchWithRetry(
      req.url,
      { method: "PUT", headers: req.headers, body: payload },
      { label: `R2 PUT s3://${req.bucket}/${objectPath}` },
    );
  } catch (err) {
    throw new Error(
      formatFetchError(`R2 upload fetch failed for s3://${req.bucket}/${objectPath}`, err),
    );
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `R2 PUT ${res.status} s3://${req.bucket}/${objectPath}${detail ? `: ${detail.slice(0, 200)}` : ""}`,
    );
  }
}
