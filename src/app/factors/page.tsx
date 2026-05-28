import type { Metadata } from "next";

import { FactorsPageClient } from "@/components/FactorsPageClient";
import { PageSurface } from "@/components/PageSurface";
import { loadFactorMethodology } from "@/lib/loadFactorMethodology";
import { buildPageMetadata } from "@/lib/seoMetadata";
import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";
import styles from "@/app/page.module.css";
import localStyles from "./page.module.css";

export const metadata: Metadata = buildPageMetadata({
  title: "Factor rankings",
  description: "Browse theme rankings by factor exposure.",
  path: "/factors",
});

export default async function FactorsPage() {
  const dataBaseUrl = stockthemesPublicDataBase() ?? null;
  const factorMethodology = await loadFactorMethodology();

  return (
    <PageSurface>
      <main className={styles.main}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Factor rankings</p>
          <h1>Rank themes by factor exposure</h1>
          <p className={styles.introLead}>
            Choose a factor and view every theme ranked by exposure score. Higher rank means stronger positive
            exposure to that factor.
          </p>
          {!dataBaseUrl ? (
            <p className={styles.introLead}>Public factor data source is unavailable in this environment.</p>
          ) : (
            <section className={`${styles.section} ${localStyles.content}`}>
              <FactorsPageClient dataBaseUrl={dataBaseUrl} factorMethodology={factorMethodology} />
            </section>
          )}
        </div>
      </main>
    </PageSurface>
  );
}
