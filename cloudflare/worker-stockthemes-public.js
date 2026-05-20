/**
 * Cloudflare Worker — CDN for gs://stockthemes-public
 *
 * With secrets GCP_SA_CLIENT_EMAIL + GCP_SA_PRIVATE_KEY: uses GCS API + Bearer token.
 * Without secrets (or if auth fails): public URL (bucket must allow allUsers read).
 *
 * Route: data.stockthemes.ai/*
 */
const GCS_BUCKET = "stockthemes-public";

const ALLOWED_ORIGINS = new Set([
  "https://stockthemes.ai",
  "https://www.stockthemes.ai",
  "https://tmccode.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

let cachedToken = { value: "", exp: 0 };

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    return {};
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

/** Cloudflare secrets sometimes store PEM with literal \\n — fix before crypto. */
function normalizePem(pem) {
  return String(pem)
    .trim()
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n");
}

function pemToArrayBuffer(pem) {
  const normalized = normalizePem(pem);
  const b64 = normalized
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const raw = atob(b64);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf.buffer;
}

function base64urlFromBytes(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64urlFromString(str) {
  return base64urlFromBytes(new TextEncoder().encode(str));
}

async function signJwt(email, pem, scope) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64urlFromString(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64urlFromString(
    JSON.stringify({
      iss: email,
      scope,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const input = new TextEncoder().encode(`${header}.${claim}`);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(pem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, input);
  return `${header}.${claim}.${base64urlFromBytes(new Uint8Array(sig))}`;
}

async function getAccessToken(env) {
  const email = env.GCP_SA_CLIENT_EMAIL?.trim();
  const pem = env.GCP_SA_PRIVATE_KEY;
  if (!email || !pem) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (cachedToken.value && cachedToken.exp > now + 60) {
    return cachedToken.value;
  }

  const jwt = await signJwt(
    email,
    pem,
    "https://www.googleapis.com/auth/devstorage.read_only",
  );
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`token exchange ${res.status}: ${detail.slice(0, 200)}`);
  }
  const data = await res.json();
  if (!data.access_token) {
    throw new Error("token response missing access_token");
  }
  cachedToken = {
    value: data.access_token,
    exp: now + (data.expires_in || 3600),
  };
  return cachedToken.value;
}

const CF_CACHE = {
  cacheEverything: true,
  cacheTtlByStatus: {
    "200-299": 86400,
    "404": 60,
    "500-599": 0,
  },
};

async function fetchPublicGcs(objectPath, request, search) {
  const gcsUrl = `https://storage.googleapis.com/${GCS_BUCKET}/${objectPath}${search}`;
  return fetch(gcsUrl, {
    method: request.method,
    headers: { Accept: request.headers.get("Accept") || "*/*" },
    cf: CF_CACHE,
  });
}

async function fetchAuthenticatedGcs(objectPath, request, token, search) {
  const qs = search ? search.slice(1) : "";
  const apiUrl =
    `https://storage.googleapis.com/storage/v1/b/${GCS_BUCKET}/o/${encodeURIComponent(objectPath)}?alt=media` +
    (qs ? `&${qs}` : "");
  return fetch(apiUrl, {
    method: request.method,
    headers: {
      Accept: request.headers.get("Accept") || "*/*",
      Authorization: `Bearer ${token}`,
    },
    cf: CF_CACHE,
  });
}

async function fetchFromGcs(objectPath, request, env) {
  const search = new URL(request.url).search;

  try {
    const token = await getAccessToken(env);
    if (token) {
      const authed = await fetchAuthenticatedGcs(objectPath, request, token, search);
      if (authed.ok || authed.status === 404) {
        return authed;
      }
      // Auth path failed — try public read while bucket is still open.
      const pub = await fetchPublicGcs(objectPath, request, search);
      if (pub.ok) return pub;
      return authed;
    }
  } catch (err) {
    console.error("GCS auth failed, falling back to public URL:", err?.message || err);
  }

  return fetchPublicGcs(objectPath, request, search);
}

export default {
  async fetch(request, env) {
    try {
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders(request) });
      }

      if (request.method !== "GET" && request.method !== "HEAD") {
        return new Response("Method not allowed", { status: 405 });
      }

      const url = new URL(request.url);
      const objectPath = url.pathname.replace(/^\/+/, "");
      if (!objectPath || objectPath.includes("..")) {
        return new Response("Not found", { status: 404, headers: corsHeaders(request) });
      }

      /** Safe auth check — no secrets in response. Remove or restrict after debugging. */
      if (objectPath === "_cdn_diag") {
        const email = env.GCP_SA_CLIENT_EMAIL?.trim() || "";
        const pem = env.GCP_SA_PRIVATE_KEY;
        const diag = {
          hasEmail: Boolean(email),
          hasKey: Boolean(pem),
          keyLooksLikePem: Boolean(pem && String(pem).includes("BEGIN PRIVATE KEY")),
          tokenStatus: "skipped",
          tokenDetail: "",
        };
        if (!email || !pem) {
          diag.tokenStatus = "missing_secrets";
        } else {
          try {
            const token = await getAccessToken(env);
            diag.tokenStatus = token ? "ok" : "no_token";
          } catch (err) {
            diag.tokenStatus = "error";
            diag.tokenDetail = String(err?.message || err).slice(0, 300);
          }
        }
        return new Response(JSON.stringify(diag, null, 2), {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            ...corsHeaders(request),
          },
        });
      }

      const gcsRes = await fetchFromGcs(objectPath, request, env);
      const headers = new Headers(gcsRes.headers);
      for (const [k, v] of Object.entries(corsHeaders(request))) {
        headers.set(k, v);
      }

      return new Response(gcsRes.body, {
        status: gcsRes.status,
        statusText: gcsRes.statusText,
        headers,
      });
    } catch (err) {
      console.error("worker error:", err?.message || err);
      return new Response(`Worker error: ${err?.message || err}`, {
        status: 500,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
  },
};
