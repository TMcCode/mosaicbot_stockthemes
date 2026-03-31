import type { Metadata } from "next";
import Link from "next/link";

import styles from "../page.module.css";
import { getManifestCached } from "@/lib/getManifestCached";

export const metadata: Metadata = {
  title: "About",
  description: "Background and methodology behind stockthemes.ai.",
};

export default async function AboutPage() {
  const { manifest } = await getManifestCached();
  const homeIntro =
    (manifest.home_intro || "").trim() ||
    "Stockthemes.ai helps you discover equity themes and groups quickly. Start with groups to find macro narratives, then drill into themes for constituent-level details.";
  const introParagraphs = homeIntro
    .split(/\n\s*\n/g)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>About</p>
          <h1>About stockthemes.ai</h1>
          <div className={styles.introCopyWrap}>
            {(introParagraphs.length ? introParagraphs : [homeIntro]).map((p, i) => (
              <p key={`about-${i}`} className={styles.introCopy}>
                {p}
              </p>
            ))}
          </div>
          <p>
            <Link href="/" style={{ fontWeight: 500 }}>
              ← Back to home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
