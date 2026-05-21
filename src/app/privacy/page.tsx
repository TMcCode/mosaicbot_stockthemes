import type { Metadata } from "next";
import Link from "next/link";

import { buildPageMetadata } from "@/lib/seoMetadata";
import styles from "../page.module.css";
import { PageSurface } from "@/components/PageSurface";

export const metadata: Metadata = buildPageMetadata({
  title: "Privacy Policy",
  description: "How stockthemes.ai collects, uses, and protects information.",
  path: "/privacy",
});

export default function PrivacyPage() {
  const updated = "May 20, 2026";
  return (
    <PageSurface>
      <main className={styles.main}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Legal</p>
          <h1>Privacy Policy</h1>
          <p className={styles.introCopy}>Last updated: {updated}</p>

          <section className={styles.section}>
            <p className={styles.introCopy}>
              stockthemes.ai (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) provides public
              thematic equity data and analysis tools. This policy explains what information we
              collect and how we use it.
            </p>

            <h3>Information we collect</h3>
            <p className={styles.introCopy}>
              We may collect basic analytics and device/browser information when you use the site,
              such as pages viewed, timestamps, approximate location, and technical diagnostics. If
              you use newsletter forms, we collect the information you submit (for example, email
              address). If you create an account using email magic links, authentication and saved
              preferences (such as watchlists when offered) are processed by our account provider
              (Supabase).
            </p>

            <h3>Advertising and cookies</h3>
            <p className={styles.introCopy}>
              We may use Google AdSense and similar services to display ads. These providers may use
              cookies or similar technologies to serve and measure ads. Learn more from Google here:{" "}
              <a href="https://policies.google.com/technologies/ads">Advertising Technologies</a>. You
              can review cookie details and controls on our{" "}
              <Link href="/cookie-policy#manage-cookies">Cookie Policy</Link>.
            </p>

            <h3>How we use information</h3>
            <p className={styles.introCopy}>
              We use information to operate and improve the site, monitor performance, prevent abuse,
              understand aggregate usage, and maintain core features including newsletter delivery and
              advertising.
            </p>

            <h3>Financial data notice</h3>
            <p className={styles.introCopy}>
              Some market and constituent data displayed on stockthemes.ai may be delayed, including
              by up to 24 hours, and may be revised or corrected when providers update source data.
            </p>

            <h3>Data sharing</h3>
            <p className={styles.introCopy}>
              We do not sell personal information. We may share limited information with service
              providers that help us run the site (for example, analytics, ad delivery, hosting, and
              email tools), subject to their applicable terms and policies.
            </p>

            <h3>Data retention</h3>
            <p className={styles.introCopy}>
              We keep data only as long as reasonably necessary for operational, legal, and security
              purposes.
            </p>

            <h3>Your choices</h3>
            <p className={styles.introCopy}>
              You can manage cookies through your browser settings and opt out of personalized
              advertising where available through Google and related opt-out controls.
            </p>

            <h3>Children&apos;s privacy</h3>
            <p className={styles.introCopy}>
              This site is not directed to children under 13, and we do not knowingly collect
              personal information from children under 13.
            </p>

            <h3>Contact</h3>
            <p className={styles.introCopy}>
              Questions about this policy can be sent through the site contact channels listed on the
              About page.
            </p>
          </section>

          <p>
            <Link href="/" style={{ fontWeight: 500 }}>
              ← Back to home
            </Link>
          </p>
        </div>
      </main>
    </PageSurface>
  );
}
