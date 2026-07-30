import type { Metadata } from "next";

import { FactorsPageGate } from "@/components/FactorsPageGate";
import { PageSurface } from "@/components/PageSurface";
import { loadFactorMethodology } from "@/lib/loadFactorMethodology";
import { buildPageMetadata } from "@/lib/seoMetadata";
import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";
import styles from "@/app/page.module.css";
import localStyles from "./page.module.css";

export const metadata: Metadata = buildPageMetadata({
  title: "Factor rankings",
  description: "Browse theme rankings by factor exposure and compare theme factor makeup.",
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
          <div className={localStyles.introHeadingGroup}>
            <h1>Rank themes by factor exposure</h1>
            <p className={styles.introLead}>
              Choose a factor for rankings, or compare theme factor makeup across ETF spreads.
            </p>
          </div>
          {!dataBaseUrl ? (
            <p className={styles.introLead}>Public factor data source is unavailable in this environment.</p>
          ) : null}
        </div>
        {dataBaseUrl ? (
          <FactorsPageGate dataBaseUrl={dataBaseUrl} factorMethodology={factorMethodology} />
        ) : null}
      </main>
    </PageSurface>
  );
}
