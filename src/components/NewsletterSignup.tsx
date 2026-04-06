"use client";

import { type FormEvent, useId, useState } from "react";
import Script from "next/script";
import posthog from "posthog-js";

import { useBeehiivApiConfigured } from "@/components/NewsletterRuntimeProvider";
import { useStockthemesTheme } from "@/components/ThemeRoot";

import styles from "./NewsletterSignup.module.css";

export type NewsletterSignupVariant = "panel" | "footer";

type Props = {
  variant?: NewsletterSignupVariant;
  /** Optional hook for GTM / analytics containers */
  className?: string;
};

const BEEHIIV_EMBED_JS = "https://subscribe-forms.beehiiv.com/embed.js";
const BEEHIIV_ATTRIBUTION_JS = "https://subscribe-forms.beehiiv.com/attribution.js";

/**
 * Two Beehiiv subscribe forms (dark- vs light-styled); Beehiiv cannot theme-switch inside one iframe.
 * Set both _LIGHT and _DARK, or use a single NEXT_PUBLIC_BEEHIIV_SUBSCRIBE_FORM_URL.
 */
function getBeehiivFormUrl(theme: "light" | "dark"): string | undefined {
  const light = process.env.NEXT_PUBLIC_BEEHIIV_SUBSCRIBE_FORM_URL_LIGHT?.trim();
  const dark = process.env.NEXT_PUBLIC_BEEHIIV_SUBSCRIBE_FORM_URL_DARK?.trim();
  const single = process.env.NEXT_PUBLIC_BEEHIIV_SUBSCRIBE_FORM_URL?.trim();
  if (light && dark) {
    return theme === "light" ? light : dark;
  }
  return single || light || dark || undefined;
}

/**
 * Iframe wins when any embed URL env is set (matches GitHub Pages + Beehiiv-styled forms).
 * Else API mode: `POST /api/newsletter/subscribe` + server `BEEHIIV_*` (local / serverful hosts only).
 */
export function NewsletterSignup({ variant = "panel", className }: Props) {
  const headingId = useId();
  const hintId = useId();
  const { theme } = useStockthemesTheme();
  const beehiivApiConfigured = useBeehiivApiConfigured();
  const [placeholderSubmitted, setPlaceholderSubmitted] = useState(false);
  const [apiEmail, setApiEmail] = useState("");
  const [apiStatus, setApiStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);

  const beehiivFormUrl = getBeehiivFormUrl(theme);

  function onPlaceholderSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPlaceholderSubmitted(true);
  }

  async function onApiSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setApiErrorMessage(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const email = String(fd.get("email") ?? "").trim();
    if (!email) {
      setApiStatus("error");
      setApiErrorMessage("Enter your email.");
      return;
    }
    setApiStatus("loading");
    posthog.capture("newsletter_signup_submitted", { variant });
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-POSTHOG-DISTINCT-ID": posthog.get_distinct_id() ?? "",
          "X-POSTHOG-SESSION-ID": posthog.get_session_id() ?? "",
        },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        posthog.capture("newsletter_signup_failed", {
          variant,
          error: data.error ?? "unknown",
          http_status: res.status,
        });
        setApiStatus("error");
        setApiErrorMessage(data.error ?? "Something went wrong. Try again.");
        return;
      }
      posthog.capture("newsletter_signup_succeeded", { variant });
      setApiStatus("success");
      setApiEmail("");
      form.reset();
    } catch (err) {
      posthog.capture("newsletter_signup_failed", {
        variant,
        error: err instanceof Error ? err.message : "network_error",
        http_status: null,
      });
      setApiStatus("error");
      setApiErrorMessage("Network error. Try again.");
    }
  }

  const rootClass =
    variant === "footer"
      ? `${styles.footer} ${className ?? ""}`.trim()
      : `${styles.panel} ${className ?? ""}`.trim();

  const copy = (
    <div className={styles.copy}>
      <h2 id={headingId} className={styles.title}>
        Sign Up for our weekly Den of Themes newsletter
      </h2>
      <p className={styles.blurb}>
        Get updates on new themes, trending themes, deeper dives and insight into inflecting themes —
        delivered in your email box every Monday morning.
      </p>
    </div>
  );

  if (beehiivFormUrl) {
    return (
      <section
        className={rootClass}
        aria-label="Den of Themes newsletter signup"
        data-newsletter-signup={variant}
      >
        <Script src={BEEHIIV_EMBED_JS} strategy="lazyOnload" />
        <Script src={BEEHIIV_ATTRIBUTION_JS} strategy="lazyOnload" />
        <div className={styles.embedWrap} data-gtm="newsletter-signup-beehiiv">
          <iframe
            key={`${theme}-${beehiivFormUrl}`}
            src={beehiivFormUrl}
            title="Subscribe to the Den of Themes newsletter"
            className="beehiiv-embed"
            data-test-id="beehiiv-embed"
            frameBorder={0}
            scrolling="no"
            style={{
              width: "100%",
              margin: 0,
              maxWidth: "100%",
              minHeight: 92,
              border: "none",
              backgroundColor: "transparent",
            }}
          />
        </div>
        <p className={styles.hint}>
          Emails are collected by Beehiiv. You can unsubscribe anytime.
        </p>
      </section>
    );
  }

  if (beehiivApiConfigured) {
    return (
      <section
        className={rootClass}
        aria-labelledby={headingId}
        data-newsletter-signup={variant}
      >
        {copy}
        <form
          className={styles.form}
          onSubmit={onApiSubmit}
          noValidate
          data-gtm="newsletter-signup-form"
        >
          <label className={styles.srOnly} htmlFor={`${headingId}-email-api`}>
            Email
          </label>
          <input
            id={`${headingId}-email-api`}
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className={styles.input}
            value={apiEmail}
            onChange={(ev) => setApiEmail(ev.target.value)}
            disabled={apiStatus === "loading" || apiStatus === "success"}
            aria-invalid={apiStatus === "error"}
            aria-describedby={hintId}
          />
          <button
            type="submit"
            className={styles.button}
            disabled={apiStatus === "loading" || apiStatus === "success"}
          >
            {apiStatus === "loading"
              ? "Signing up…"
              : apiStatus === "success"
                ? "Subscribed"
                : "Notify me"}
          </button>
        </form>
        <p id={hintId} className={styles.hint}>
          {apiStatus === "success"
            ? "Thanks! Check your inbox to confirm if your publication uses double opt-in."
            : apiStatus === "error" && apiErrorMessage
              ? apiErrorMessage
              : "We use Beehiiv for the list. You can unsubscribe anytime."}
        </p>
      </section>
    );
  }

  return (
    <section
      className={rootClass}
      aria-labelledby={headingId}
      data-newsletter-signup={variant}
    >
      {copy}
      <form
        className={styles.form}
        onSubmit={onPlaceholderSubmit}
        noValidate
        data-gtm="newsletter-signup-form"
      >
        <label className={styles.srOnly} htmlFor={`${headingId}-email`}>
          Email
        </label>
        <input
          id={`${headingId}-email`}
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          className={styles.input}
          disabled={placeholderSubmitted}
          aria-describedby={hintId}
        />
        <button type="submit" className={styles.button} disabled={placeholderSubmitted}>
          {placeholderSubmitted ? "Coming soon" : "Notify me"}
        </button>
      </form>
      <p id={hintId} className={styles.hint}>
        {placeholderSubmitted
          ? "We’re not collecting addresses yet — this button is a placeholder."
          : process.env.NODE_ENV === "development"
            ? "Not live — set NEXT_PUBLIC_BEEHIIV_SUBSCRIBE_FORM_URL(_LIGHT/_DARK), or BEEHIIV_API_KEY + BEEHIIV_PUBLICATION_ID if no embed URL."
            : "Newsletter signup is not available yet — check back soon."}
      </p>
    </section>
  );
}
