import posthog from "posthog-js";

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
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
  debug: process.env.NODE_ENV === "development",
});
