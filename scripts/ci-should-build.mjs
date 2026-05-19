/**
 * GitHub Actions: skip full static export when manifest.as_of unchanged (scheduled runs).
 * Writes GITHUB_OUTPUT: should_build=true|false, reason=...
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const DEPLOY_META = path.join(root, ".cache", "stockthemes-public", "_pages_deploy_meta.json");

const MANIFEST_URL =
  process.env.MANIFEST_URL?.trim() ||
  process.env.NEXT_PUBLIC_STOCKTHEMES_MANIFEST_URL?.trim() ||
  "https://data.stockthemes.ai/manifest.json";

function writeOutput(shouldBuild, reason) {
  const out = process.env.GITHUB_OUTPUT;
  const line = (k, v) => `${k}=${v}\n`;
  if (out) {
    fs.appendFileSync(out, line("should_build", shouldBuild ? "true" : "false"));
    fs.appendFileSync(out, line("reason", reason.replace(/\n/g, " ")));
  }
  console.log(`ci-should-build: should_build=${shouldBuild} (${reason})`);
}

function readDeployedAsOf() {
  try {
    const meta = JSON.parse(fs.readFileSync(DEPLOY_META, "utf8"));
    return String(meta.as_of || "");
  } catch {
    return "";
  }
}

async function fetchLiveAsOf() {
  const res = await fetch(MANIFEST_URL, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`manifest HTTP ${res.status} from ${MANIFEST_URL}`);
  }
  const data = JSON.parse(await res.text());
  return String(data.as_of || "");
}

async function main() {
  const event = process.env.GITHUB_EVENT_NAME || "";
  const force = process.env.FORCE_BUILD === "true" || process.env.FORCE_BUILD === "1";

  if (force) {
    writeOutput(true, "force_build");
    return;
  }

  // Code pushes always rebuild (layout, deps, app logic).
  if (event === "push") {
    writeOutput(true, "push_to_main");
    return;
  }

  if (event === "workflow_dispatch") {
    writeOutput(true, "manual_dispatch");
    return;
  }

  if (event !== "schedule") {
    writeOutput(true, `event_${event || "unknown"}`);
    return;
  }

  const liveAsOf = await fetchLiveAsOf();
  const deployedAsOf = readDeployedAsOf();

  if (!deployedAsOf) {
    writeOutput(true, `no_prior_deploy_meta live_as_of=${liveAsOf}`);
    return;
  }

  if (liveAsOf === deployedAsOf) {
    writeOutput(false, `manifest_unchanged as_of=${liveAsOf}`);
    return;
  }

  writeOutput(true, `manifest_changed ${deployedAsOf} -> ${liveAsOf}`);
}

main().catch((e) => {
  console.error(e);
  writeOutput(true, "check_failed_default_build");
  process.exit(0);
});
