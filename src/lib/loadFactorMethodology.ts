import { cache } from "react";
import { readFile } from "node:fs/promises";
import path from "node:path";

export type FactorMethodologyItem = {
  id: string;
  label: string;
  summary: string;
};

function parseSummary(block: string): string {
  const match = block.match(/^- \*\*Summary:\*\*\s*(.+)$/m);
  return match?.[1]?.trim() ?? "";
}

function parseFactorMethodologyMarkdown(md: string): Record<string, FactorMethodologyItem> {
  const out: Record<string, FactorMethodologyItem> = {};
  const sectionRegex = /^##\s+([A-Z0-9_]+)\s+-\s+(.+)$/gm;
  const matches = [...md.matchAll(sectionRegex)];
  for (let i = 0; i < matches.length; i += 1) {
    const current = matches[i];
    const next = matches[i + 1];
    const start = current.index ?? 0;
    const end = next?.index ?? md.length;
    const block = md.slice(start, end);
    const id = current[1].trim();
    const label = current[2].trim();
    const summary = parseSummary(block);
    if (!summary) continue;
    out[id] = { id, label, summary };
  }
  return out;
}

export const loadFactorMethodology = cache(async (): Promise<Record<string, FactorMethodologyItem>> => {
  try {
    const filePath = path.join(process.cwd(), "docs", "factor_methodology_explainer.md");
    const md = await readFile(filePath, "utf8");
    return parseFactorMethodologyMarkdown(md);
  } catch {
    return {};
  }
});
