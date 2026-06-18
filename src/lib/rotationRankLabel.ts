import type { RotationRank10d } from "@/lib/buildRotationMapData";

export function formatRotationRank10d(
  rank: RotationRank10d | undefined,
  kind: "group" | "theme",
): string | null {
  if (!rank) return null;
  const parts: string[] = [];
  if (kind === "theme") {
    parts.push(`#${rank.universeRank} of ${rank.universeTotal}`);
    if (rank.groupRank != null && rank.groupTotal != null) {
      parts.push(`#${rank.groupRank} of ${rank.groupTotal} in group`);
    }
  } else {
    parts.push(`#${rank.universeRank} of ${rank.universeTotal} groups (10D)`);
  }
  return parts.join(" · ");
}
