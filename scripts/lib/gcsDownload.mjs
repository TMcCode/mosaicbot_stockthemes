/**
 * Authenticated reads from a private GCS bucket (CI / local prebuild).
 * Uses the same stockthemes-cdn-reader service account as the Cloudflare Worker.
 *
 * Set STOCKTHEMES_GCS_SA_JSON to the full service account JSON string, or
 * STOCKTHEMES_GCS_SA_JSON_FILE to a path (local only).
 */
import crypto from "crypto";
import fs from "fs";

const DEFAULT_BUCKET = "stockthemes-public";
const TOKEN_SCOPE = "https://www.googleapis.com/auth/devstorage.read_only";

let cachedToken = { value: "", exp: 0 };

function normalizePem(pem) {
  return String(pem)
    .trim()
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n");
}

function base64url(buf) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signJwt(clientEmail, privateKeyPem) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claim = base64url(
    Buffer.from(
      JSON.stringify({
        iss: clientEmail,
        scope: TOKEN_SCOPE,
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      }),
    ),
  );
  const input = `${header}.${claim}`;
  const key = crypto.createPrivateKey(normalizePem(privateKeyPem));
  const sig = base64url(crypto.sign("RSA-SHA256", Buffer.from(input), key));
  return `${input}.${sig}`;
}

export function loadGcsServiceAccount() {
  const inline = process.env.STOCKTHEMES_GCS_SA_JSON?.trim();
  if (inline) {
    return JSON.parse(inline);
  }
  const filePath = process.env.STOCKTHEMES_GCS_SA_JSON_FILE?.trim();
  if (filePath) {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  }
  return null;
}

export function gcsSyncEnabled() {
  if (process.env.STOCKTHEMES_SYNC_VIA_GCS === "1") {
    return Boolean(loadGcsServiceAccount());
  }
  return false;
}

async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken.value && cachedToken.exp > now + 60) {
    return cachedToken.value;
  }
  const jwt = signJwt(sa.client_email, sa.private_key);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`GCS token exchange ${res.status}: ${detail.slice(0, 200)}`);
  }
  const data = await res.json();
  if (!data.access_token) {
    throw new Error("GCS token response missing access_token");
  }
  cachedToken = {
    value: data.access_token,
    exp: now + (data.expires_in || 3600),
  };
  return cachedToken.value;
}

/**
 * @param {string} objectPath e.g. themes/foo.json
 */
export async function downloadGcsObject(objectPath) {
  const sa = loadGcsServiceAccount();
  if (!sa?.client_email || !sa?.private_key) {
    throw new Error("STOCKTHEMES_GCS_SA_JSON (or _FILE) not configured");
  }
  const bucket = process.env.STOCKTHEMES_GCS_BUCKET?.trim() || DEFAULT_BUCKET;
  const token = await getAccessToken(sa);
  const url =
    `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(objectPath)}?alt=media`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`GCS ${res.status} gs://${bucket}/${objectPath}`);
  }
  return res.text();
}
