import styles from "./ThemeAuthGateSkeleton.module.css";

type Props = {
  className?: string;
  /** Compact vs taller placeholder (factor card vs thesis row). */
  variant?: "thesis" | "factor";
};

/** Layout placeholder while auth is resolving and we don’t yet presume a session. */
export function ThemeAuthGateSkeleton({ className, variant = "thesis" }: Props) {
  const lines =
    variant === "factor" ? (
      <>
        <div className={`${styles.line} ${styles.lineShort}`} />
        <div className={`${styles.line} ${styles.lineLong}`} />
        <div className={`${styles.line} ${styles.lineMid}`} />
        <div className={`${styles.line} ${styles.lineLong}`} />
      </>
    ) : (
      <>
        <div className={`${styles.line} ${styles.lineShort}`} />
        <div className={`${styles.line} ${styles.lineLong}`} />
        <div className={`${styles.line} ${styles.lineMid}`} />
      </>
    );

  return (
    <div
      className={[styles.skeleton, className].filter(Boolean).join(" ")}
      aria-hidden="true"
    >
      {lines}
    </div>
  );
}
