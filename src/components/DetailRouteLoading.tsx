import { PageSurface } from "@/components/PageSurface";

import styles from "@/app/page.module.css";

type Props = {
  label: string;
};

/** Soft-nav shell while a detail/compare route resolves. */
export function DetailRouteLoading({ label }: Props) {
  return (
    <PageSurface>
      <main className={styles.main}>
        <div className={styles.intro}>
          <p className={styles.introPunchline} aria-busy="true">
            {label}
          </p>
          <div
            style={{ minHeight: 320, marginTop: "1.25rem" }}
            aria-hidden
          />
        </div>
      </main>
    </PageSurface>
  );
}
