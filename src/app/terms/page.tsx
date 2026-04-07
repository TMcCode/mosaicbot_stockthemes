import type { Metadata } from "next";
import Link from "next/link";

import { buildPageMetadata } from "@/lib/seoMetadata";
import styles from "../page.module.css";

export const metadata: Metadata = buildPageMetadata({
  title: "Terms of Service",
  description: "Terms for using stockthemes.ai.",
  path: "/terms",
});

export default function TermsPage() {
  const updated = "April 7, 2026";
  return (
    <div className={`st-surface ${styles.page}`}>
      <main className={styles.main}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Legal</p>
          <h1>Terms of Service</h1>
          <p className={styles.introCopy}>Last updated: {updated}</p>

          <section className={styles.section}>
            <p className={styles.introCopy}>
              By using stockthemes.ai, you agree to these Terms of Service. If you do not agree, do
              not use the site.
            </p>

            <h3>Informational use only</h3>
            <p className={styles.introCopy}>
              Content and data on stockthemes.ai are provided for informational purposes only and do
              not constitute financial, investment, legal, or tax advice.
            </p>

            <h3>No advisor-client or fiduciary relationship</h3>
            <p className={styles.introCopy}>
              Your use of this site does not create an investment adviser, broker-dealer, fiduciary,
              agency, partnership, or professional-client relationship between you and stockthemes.ai
              or its operators.
            </p>

            <h3>No investment recommendation</h3>
            <p className={styles.introCopy}>
              Nothing on this site is a recommendation or solicitation to buy or sell any security.
              You are solely responsible for your investment decisions.
            </p>

            <h3>Market data delays and methodology changes</h3>
            <p className={styles.introCopy}>
              Market, price, and constituent data may be delayed, including by up to 24 hours.
              Historical values, classifications, and theme methodology may be revised over time. Past
              performance is not indicative of future results.
            </p>

            <h3>Accuracy and availability</h3>
            <p className={styles.introCopy}>
              The site and all content are provided &quot;as is&quot; and &quot;as available&quot;.
              We strive for accuracy but do not guarantee completeness, reliability, timeliness, or
              uninterrupted availability of content, data, or services.
            </p>

            <h3>Third-party services and links</h3>
            <p className={styles.introCopy}>
              The site may include links or integrations from third parties (for example, analytics,
              newsletter, and ad providers). Their terms and policies apply to their services.
            </p>

            <h3>Acceptable use</h3>
            <p className={styles.introCopy}>
              You agree not to misuse the site, interfere with operations, attempt unauthorized
              access, or use automated means in ways that harm service integrity.
            </p>

            <h3>Limitation of liability</h3>
            <p className={styles.introCopy}>
              To the fullest extent permitted by law, stockthemes.ai and its operators are not liable
              for direct, indirect, incidental, consequential, or special damages arising from use of
              the site or reliance on its content.
            </p>

            <h3>Indemnification</h3>
            <p className={styles.introCopy}>
              You agree to indemnify and hold harmless stockthemes.ai and its operators from claims,
              liabilities, losses, and expenses (including reasonable legal fees) arising from your
              misuse of the site or violation of these terms.
            </p>

            <h3>Governing law and venue</h3>
            <p className={styles.introCopy}>
              These terms are governed by applicable law in your principal operating jurisdiction
              unless otherwise required by law. Any dispute will be brought in courts of competent
              jurisdiction in that venue.
            </p>

            <h3>Changes to these terms</h3>
            <p className={styles.introCopy}>
              We may update these terms from time to time. Continued use after updates means you
              accept the revised terms.
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
