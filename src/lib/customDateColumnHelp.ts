import type { ManifestSelectedDateV0 } from "@/types/manifest.v0";

export function normalizeEventKey(value: string): string {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function fmtSlashDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

export function buildSelectedDateLookup(
  rows: ManifestSelectedDateV0[] | undefined,
): Map<string, ManifestSelectedDateV0> {
  return new Map(
    (rows ?? []).map((r) => [normalizeEventKey(String(r.day_name || "")), r]),
  );
}

export function customDateHelpText(
  col: string,
  selectedDateByKey: Map<string, ManifestSelectedDateV0>,
): string | undefined {
  const key = normalizeEventKey(col);
  const row = selectedDateByKey.get(key);
  const datePrefix = row?.date ? `${fmtSlashDate(row.date)}: ` : "";
  if (key === "IRANWAR") return `${datePrefix}Start of U.S. War with Iran`;
  if (key === "LIBDAY") {
    return `${datePrefix}U.S. President Trump's Tariff 'Liberation Day' speech date`;
  }
  return undefined;
}
