import type { Metadata } from "next";
import Link from "next/link";

import styles from "../page.module.css";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "How stockthemes.ai uses cookies and how you can manage them.",
};

export default function CookiePolicyPage() {
  const updated = "April 7, 2026";
  return (
    <div className={`st-surface ${styles.page}`}>
      <main className={styles.main}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Legal</p>
          <h1>Cookie Policy</h1>
          <p className={styles.introCopy}>Last updated: {updated}</p>

          <section className={styles.section}>
            <p className={styles.introCopy}>
              This Cookie Policy explains how stockthemes.ai uses cookies and similar technologies to
              operate, measure, and improve the site, including advertising-related functionality.
            </p>

            <h3>What are cookies?</h3>
            <p className={styles.introCopy}>
              Cookies are small text files stored by your browser. They can help remember preferences,
              support core functionality, and measure site usage.
            </p>

            <h3>How we use cookies</h3>
            <p className={styles.introCopy}>
              We and our service providers may use cookies for analytics, reliability, security, and
              ad delivery/measurement. Some cookies may be set by third-party services we use.
            </p>

            <h3>Advertising cookies</h3>
            <p className={styles.introCopy}>
              We use Google AdSense. Google and its partners may use cookies to serve and measure ads.
              You can learn more at{" "}
              <a href="https://policies.google.com/technologies/ads">Google Advertising Technologies</a>.
            </p>

            <h3 id="manage-cookies">Manage cookies</h3>
            <p className={styles.introCopy}>
              You can control or delete cookies in your browser settings. You can also manage ad
              personalization controls through Google settings and related opt-out tools.
            </p>

            <h3>Updates</h3>
            <p className={styles.introCopy}>
              We may update this policy from time to time. Continued use of the site after updates
              means you accept the updated policy.
            </p>
          </section>

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
