import posthog from "posthog-js";

const posthogToken =
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN ?? process.env.NEXT_PUBLIC_POSTHOG_KEY;

if (posthogToken) {
  posthog.init(posthogToken, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    ui_host: "https://us.posthog.com",
    defaults: "2026-01-30",
    // Keep initial load ultra-lean: only core event capture.
    capture_exceptions: false,
    disable_session_recording: true,
    disable_external_dependency_loading: true,
    disable_surveys: true,
    capture_performance: false,
    autocapture: false,
    capture_pageview: true,
    capture_pageleave: true,
    persistence: "localStorage+cookie",
    loaded: (ph) => {
      ph.register({
        app: "stockthemes_web",
        env: process.env.NODE_ENV,
      });
    },
    // Keep dev consoles and startup lean unless explicitly enabled.
    debug: process.env.NEXT_PUBLIC_POSTHOG_DEBUG === "1",
  });
}
