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

  return <ThemeIdeaSuggestPageClient groups={groups} />;
}
