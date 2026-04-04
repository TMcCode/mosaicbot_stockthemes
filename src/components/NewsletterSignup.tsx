"use client";

import { type FormEvent, useState } from "react";

import styles from "./NewsletterSignup.module.css";

export type NewsletterSignupVariant = "panel" | "footer";

type Props = {
  variant?: NewsletterSignupVariant;
  /** Optional hook for GTM / analytics containers */
  className?: string;
};

/**
 * Weekly newsletter CTA. Wire-up later: point `action` to Buttondown/Beehiiv/ConvertKit,
 * or POST to your own API / server action. Env-based URL keeps secrets out of the client
 * if you use a server action.
 */
export function NewsletterSignup({ variant = "panel", className }: Props) {
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  const rootClass =
    variant === "footer"
      ? `${styles.footer} ${className ?? ""}`.trim()
      : `${styles.panel} ${className ?? ""}`.trim();

  return (
    <section
      className={rootClass}
      aria-labelledby="newsletter-heading"
      data-newsletter-signup={variant}
    >
      <div className={styles.copy}>
        <h2 id="newsletter-heading" className={styles.title}>
          Sign Up for our weekly Den of Themes newsletter
        </h2>
        <p className={styles.blurb}>
          Get updates on trending themes, deeper dives, and which narratives look like they&apos;re
          inflecting — delivered in your email box every Monday morning.
        </p>
      </div>
      <form
        className={styles.form}
        onSubmit={onSubmit}
        noValidate
        data-gtm="newsletter-signup-form"
      >
        <label className={styles.srOnly} htmlFor="newsletter-email">
          Email
        </label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          className={styles.input}
          disabled={submitted}
          aria-describedby="newsletter-hint"
        />
        <button type="submit" className={styles.button} disabled={submitted}>
          {submitted ? "Coming soon" : "Notify me"}
        </button>
      </form>
      <p id="newsletter-hint" className={styles.hint}>
        {submitted
          ? "We’re not collecting addresses yet — this button is a placeholder."
          : "Not live yet — signup will open when the list is ready."}
      </p>
    </section>
  );
}
