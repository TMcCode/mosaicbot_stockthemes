import { Suspense } from "react";

import { SiteFooter } from "@/components/SiteFooter";
import { getManifestCached } from "@/lib/getManifestCached";

/** Manifest fetch for footer “Last published” — do not block page HTML on it. */
async function SiteFooterWithAsOf() {
  const { manifest } = await getManifestCached();
  return <SiteFooter dataAsOf={manifest.as_of} />;
}

export function SiteFooterAsOf() {
  return (
    <Suspense fallback={<SiteFooter />}>
      <SiteFooterWithAsOf />
    </Suspense>
  );
}
