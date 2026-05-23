import styles from "@/app/page.module.css";

type Props = {
  heading: string;
  headingId: string;
  intro?: string | null;
};

/** Crawlable theme/group intro below the chart (keeps hero uncluttered). */
export function DetailAboutIntro({ heading, headingId, intro }: Props) {
  const text = intro?.trim();
  if (!text) return null;

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 id={headingId}>{heading}</h2>
      <p className={styles.detailAboutProse}>{text}</p>
    </section>
  );
}
