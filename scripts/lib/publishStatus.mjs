/**
 * Contabo full-manifest lock: `publish_status.v0.json` on stockthemes-public.
 * Pages CI waits while status === "running" so sync does not race mid-upload.
 */
import { downloadR2Object, r2SyncEnabled } from "./r2Download.mjs";

export const PUBLISH_STATUS_REL = "publish_status.v0.json";

const DEFAULT_MAX_WAIT_MS = 25 * 60 * 1000;
const DEFAULT_POLL_MS = 20_000;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * @param {string} [base] public CDN base (used when R2 sync is off)
 * @returns {Promise<{ status: string, as_of?: string, build_id?: string, updated_at?: string } | null>}
 */
export async function fetchPublishStatus(base) {
  try {
    let text;
    if (r2SyncEnabled()) {
      text = await downloadR2Object(PUBLISH_STATUS_REL);
    } else if (base) {
      const res = await fetch(`${base.replace(/\/$/, "")}/${PUBLISH_STATUS_REL}`, {
        cache: "no-store",
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      text = await res.text();
    } else {
      return null;
    }
    const data = JSON.parse(text);
    if (!data || typeof data !== "object") return null;
    return {
      status: String(data.status || "").trim().toLowerCase(),
      as_of: data.as_of ? String(data.as_of) : undefined,
      build_id: data.build_id ? String(data.build_id) : undefined,
      updated_at: data.updated_at ? String(data.updated_at) : undefined,
    };
  } catch (e) {
    // Missing object = older publishers; treat as idle/complete.
    const msg = e instanceof Error ? e.message : String(e);
    if (/\b404\b/.test(msg)) return null;
    console.warn(`publishStatus: read failed (${msg})`);
    return null;
  }
}

/**
 * Block while Contabo marks a full publish as running.
 * @returns {Promise<"idle"|"complete"|"failed"|"timeout"|"missing">}
 */
export async function waitForPublishIdle({
  base,
  maxWaitMs = Number(process.env.STOCKTHEMES_PUBLISH_WAIT_MS || DEFAULT_MAX_WAIT_MS),
  pollMs = Number(process.env.STOCKTHEMES_PUBLISH_POLL_MS || DEFAULT_POLL_MS),
  label = "publishStatus",
} = {}) {
  const started = Date.now();
  let first = true;
  while (Date.now() - started <= maxWaitMs) {
    const st = await fetchPublishStatus(base);
    if (!st) {
      if (first) console.log(`${label}: no publish_status.v0.json (treat as idle)`);
      return "missing";
    }
    if (st.status === "running") {
      const waited = Math.round((Date.now() - started) / 1000);
      console.log(
        `${label}: publish in progress` +
          (st.build_id ? ` build_id=${st.build_id}` : "") +
          (st.updated_at ? ` updated_at=${st.updated_at}` : "") +
          ` — waiting (${waited}s)`,
      );
      await sleep(Math.max(5_000, pollMs));
      first = false;
      continue;
    }
    if (st.status === "failed") {
      console.warn(`${label}: last publish marked failed` + (st.as_of ? ` as_of=${st.as_of}` : ""));
      return "failed";
    }
    if (!first) {
      console.log(`${label}: publish idle (status=${st.status || "complete"})`);
    }
    return st.status === "complete" ? "complete" : "idle";
  }
  console.error(`${label}: timed out waiting for publish_status after ${maxWaitMs}ms`);
  return "timeout";
}
