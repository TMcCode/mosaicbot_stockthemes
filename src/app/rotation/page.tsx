import type { Metadata } from "next";

import styles from "@/app/page.module.css";
import { RotationMapGate } from "@/components/RotationMapGate";
import { PageSurface } from "@/components/PageSurface";
import { buildPageMetadata } from "@/lib/seoMetadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Theme rotation map",
  description:
    "See which theme groups are heating up or fading — short-term vs longer-term performance relative to the S&P 500.",
  path: "/rotation",
});

/** Static shell only — map data loads client-side after sign-in (no extra SSR fetches). */
export default function RotationPage() {
  return (
    <PageSurface>
      <main className={styles.main}>
        <div className={styles.intro}>
          <RotationMapGate eyebrow="Theme rotation map" />
        </div>
      </main>
    </PageSurface>
  );
}
