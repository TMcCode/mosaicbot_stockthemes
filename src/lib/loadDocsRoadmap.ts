import { readFile } from "node:fs/promises";
import path from "node:path";

export type DocsRoadmapItem = {
  id: string;
  title: string;
  description: string;
  category_label: string;
  subscribers_required: number | null;
  /** Crossed off when already live / unlocked. */
  done?: boolean;
  /** Omit from public docs lanes / leftover list. */
  hidden?: boolean;
};

export type DocsRoadmapPayload = {
  title: string;
  intro: string;
  paid_subscribers_display?: number | null;
  disclaimer: string;
  items: DocsRoadmapItem[];
};

export async function loadDocsRoadmap(): Promise<DocsRoadmapPayload | null> {
  try {
    const abs = path.join(process.cwd(), "public", "docs", "roadmap.v0.json");
    const raw = await readFile(abs, "utf8");
    return JSON.parse(raw) as DocsRoadmapPayload;
  } catch {
    return null;
  }
}

export function roadmapItemMap(
  payload: DocsRoadmapPayload | null,
): Map<string, DocsRoadmapItem> {
  const map = new Map<string, DocsRoadmapItem>();
  for (const item of payload?.items || []) {
    if (item?.id && !item.hidden) map.set(item.id, item);
  }
  return map;
}

export function fmtSubscriberNeed(n: number | null | undefined): string | null {
  if (n == null || !Number.isFinite(n)) return null;
  return `${Math.round(n).toLocaleString("en-US")} subscribers`;
}
