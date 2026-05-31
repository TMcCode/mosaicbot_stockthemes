import { ThemeIdeaSuggestPageClient } from "@/app/account/suggest/ThemeIdeaSuggestPageClient";
import { getManifestCached } from "@/lib/getManifestCached";

export default async function ThemeIdeaSuggestPage() {
  const { manifest } = await getManifestCached();
  const groups = [...(manifest.groups ?? [])]
    .map((g) => ({
      slug: String(g.slug || "").trim(),
      name: String(g.name || "").trim(),
    }))
    .filter((g) => g.slug && g.name)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  const groupNameBySlug = new Map(groups.map((g) => [g.slug, g.name]));
  const themes = [...(manifest.themes ?? [])]
    .map((t) => ({
      slug: String(t.slug || "").trim(),
      name: String(t.name || "").trim(),
      groupName: t.group_slug ? groupNameBySlug.get(String(t.group_slug)) : undefined,
    }))
    .filter((t) => t.slug && t.name)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  return <ThemeIdeaSuggestPageClient groups={groups} themes={themes} />;
}
