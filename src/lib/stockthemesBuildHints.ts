/** True in `next dev`; false in production static export / Pages deploy. */
export function stockthemesDevBuildHintsEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

type DataSource = "live" | "fixture";

function manifestSourceLabel(source: DataSource): string {
  return source === "live" ? "live manifest" : "local fixture";
}

function detailSourceLabel(source: DataSource, kind: "theme" | "group"): string {
  return source === "live"
    ? kind === "theme"
      ? "live theme JSON"
      : "live group JSON"
    : "local fixture";
}

/** Index/compare eyebrows — production shows prefix only (AdSense §6). */
export function catalogEyebrowText(prefix: string, manifestSource: DataSource): string {
  if (!stockthemesDevBuildHintsEnabled()) return prefix;
  return `${prefix} · ${manifestSourceLabel(manifestSource)}`;
}

/** Theme/group detail eyebrows — production shows “Theme” or “Group” only. */
export function detailEyebrowText(
  prefix: "Theme" | "Group",
  manifestSource: DataSource,
  detailSource?: DataSource | null,
): string {
  if (!stockthemesDevBuildHintsEnabled()) return prefix;
  const kind = prefix === "Theme" ? "theme" : "group";
  const base = `${prefix} · ${manifestSourceLabel(manifestSource)}`;
  if (!detailSource) return base;
  return `${base} · ${detailSourceLabel(detailSource, kind)}`;
}

/** Home hero eyebrow — production omits manifest/fixture labels. */
export function homeEyebrowText(manifestSource: DataSource): string {
  if (!stockthemesDevBuildHintsEnabled()) return "stockthemes.ai";
  return manifestSource === "live"
    ? "stockthemes.ai · manifest v0 (live)"
    : "stockthemes.ai · manifest v0 (local fixture)";
}

export const THEME_DETAIL_UNAVAILABLE_COPY =
  "We’re refreshing this theme page. Holdings and charts should appear shortly—try again later or browse other themes.";

export const GROUP_DETAIL_UNAVAILABLE_COPY =
  "We’re refreshing this group page. Theme lists and charts should appear shortly—try again later or browse other groups.";

export const THEME_RUNTIME_LOADING_COPY = "Loading latest theme data…";

export const THEME_RUNTIME_LOADING_DEV = "Loading theme JSON from bucket…";

export function themeRuntimeErrorProdMessage(): string {
  return "We couldn’t load the latest data for this theme. Please refresh the page or try again in a few minutes.";
}

export function themeRuntimeErrorDevMessage(slug: string, detail: string): string {
  return `No theme detail JSON at themes/${slug}.json (${detail}). Ensure MosaicBot stockthemes_manifest.py uploaded this file to the public bucket, and that CORS allows GET from this site (e.g. GitHub Pages origin in gcs-cors).`;
}

export const THEME_RUNTIME_HYDRATE_DISABLED_PROD =
  "This page is temporarily unavailable. Please try again later.";

export const THEME_RUNTIME_HYDRATE_DISABLED_DEV =
  "Theme data was not embedded in this static build. In GitHub Actions run Deploy to GitHub Pages with “Re-download all theme/group JSON” enabled, or push the latest main after ETL publishes.";

export const CHART_FETCH_ERROR_PROD =
  "We couldn’t load the latest chart for this page. Please refresh or try again later.";

export function chartFetchErrorDevMessage(fetchError: string, lastFetchUrl?: string): string {
  const urlPart = lastFetchUrl ? ` Request URL: ${lastFetchUrl}.` : "";
  return `Could not load chart from bucket (${fetchError}).${urlPart} Your page origin must match an entry in the bucket CORS list (e.g. use http://localhost:3000 not your LAN IP unless that origin is added). See MosaicBot docs/stockthemes/gcs-cors.example.json and gsutil cors set ….`;
}

export const CHART_MISSING_IN_PAYLOAD_PROD =
  "Chart data is not available for this page yet. Please check back after the next data update.";

export const CHART_MISSING_IN_PAYLOAD_DEV =
  "Live JSON loaded but chart_1y is missing or empty — republish from stockthemes_manifest.py after intraday chart parquets exist.";
