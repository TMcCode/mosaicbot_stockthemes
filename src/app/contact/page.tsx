import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { PageSurface } from "@/components/PageSurface";
import {
  HELLO_EMAIL,
  mailtoHref,
  SUPPORT_EMAIL,
  THEME_IDEAS_EMAIL,
} from "@/lib/contactEmails";
import { buildPageMetadata } from "@/lib/seoMetadata";

import styles from "../page.module.css";

export const metadata: Metadata = buildPageMetadata({
  title: "Contact",
  description: "How to reach stockthemes.ai for general inquiries, support, and theme suggestions.",
  path: "/contact",
});

type ContactRow = {
  email: string;
  title: string;
  body: string;
  mailSubject?: string;
  extra?: ReactNode;
};

const ROWS: ContactRow[] = [
  {
    email: HELLO_EMAIL,
    title: "General & legal",
    body: "Privacy questions, press, partnerships, and other general mail.",
    mailSubject: "stockthemes.ai inquiry",
  },
  {
    email: SUPPORT_EMAIL,
    title: "Site support",
    body: "Help using the site, reporting a bug, or account / watchlist issues.",
    mailSubject: "stockthemes.ai support",
  },
  {
    email: THEME_IDEAS_EMAIL,
    title: "Theme & group ideas",
    body: "Suggest a new theme basket or group. Signed-in users can also use the structured form.",
    mailSubject: "Theme or group suggestion",
    extra: (
      <>
        {" "}
        <Link href="/account/suggest">Submit a suggestion</Link> (sign-in required).
      </>
    ),
  },
];

export default function ContactPage() {
  return (
    <PageSurface>
      <main className={styles.main}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Contact</p>
          <h1>Contact stockthemes.ai</h1>
          <p className={styles.introCopy}>
            We read every message. For privacy-specific questions, you can also reference our{" "}
            <Link href="/privacy">Privacy Policy</Link>.
          </p>
          <p className={styles.introCopy}>
            We aim to reply within a few business days. Nothing on this site is investment advice.
          </p>

          <section className={styles.section} aria-labelledby="contact-inboxes">
            <h2 id="contact-inboxes">Email</h2>
            <ul className={styles.contactList}>
              {ROWS.map((row) => (
                <li key={row.email} className={styles.contactItem}>
                  <h3 className={styles.contactItemTitle}>{row.title}</h3>
                  <p className={styles.introCopy}>
                    <a href={mailtoHref(row.email, row.mailSubject)} style={{ fontWeight: 600 }}>
                      {row.email}
                    </a>
                  </p>
                  <p className={styles.introCopy}>
                    {row.body}
                    {row.extra}
                  </p>
                </li>
              ))}
            </ul>
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
