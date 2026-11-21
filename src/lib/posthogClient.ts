type PostHogClient = typeof import("posthog-js")["default"];

let clientPromise: Promise<PostHogClient | null> | null = null;

/** UA / automation signals PostHog's default list often misses (scrapers with real Chrome UAs still get past UA checks). */
const EXTRA_BOT_UA =
  /(?:^$|bot|crawler|spider|scrapy|curl\/|wget|python-requests|httpclient|go-http|axios\/|node-fetch|headless|phantom|selenium|playwright|puppeteer|lighthouse|pagespeed|pingdom|gtmetrix|preview|monitor|uptime)/i;

function isLikelyAnalyticsBot(): boolean {
  if (typeof navigator === "undefined") return true;
  try {
    if (navigator.webdriver) return true;
    const ua = navigator.userAgent || "";
    if (EXTRA_BOT_UA.test(ua)) return true;
    const brands = (
      navigator as Navigator & {
        userAgentData?: { brands?: { brand: string }[] };
      }
    ).userAgentData?.brands;
    if (brands?.some((b) => /headless|bot/i.test(b.brand))) return true;
  } catch {
    return true;
  }
  return false;
}

/**
 * Wait for a cheap human signal before loading analytics.
 * Scrapers that hit HTML and exit in ~10s usually never fire these.
 * Passive long dwell fallback still counts quiet human readers.
 */
function whenHumanEngagement(): Promise<boolean> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    let done = false;
    let dwellTimer: number | null = null;

    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      cleanup();
      resolve(ok);
    };

    const onEngage = () => finish(true);
    const events: (keyof WindowEventMap)[] = [
      "pointerdown",
      "keydown",
      "scroll",
      "touchstart",
      "mousemove",
    ];

    const clearDwell = () => {
      if (dwellTimer != null) {
        window.clearTimeout(dwellTimer);
        dwellTimer = null;
      }
    };

    const armDwell = () => {
      clearDwell();
      if (document.visibilityState !== "visible") return;
      // Quiet human readers: visible tab for 12s counts as engagement.
      dwellTimer = window.setTimeout(() => finish(true), 12_000);
    };

    const cleanup = () => {
      for (const ev of events) {
        window.removeEventListener(ev, onEngage);
      }
      document.removeEventListener("visibilitychange", onVisibility);
      clearDwell();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") armDwell();
      else clearDwell();
    };

    for (const ev of events) {
      window.addEventListener(ev, onEngage, { once: true, passive: true });
    }
    document.addEventListener("visibilitychange", onVisibility);
    armDwell();
  });
}

export function initializePostHog(): Promise<PostHogClient | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (clientPromise) return clientPromise;

  const token =
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN ?? process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!token) return Promise.resolve(null);

  // Dev stays quiet unless explicitly debugging analytics.
  if (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_POSTHOG_DEBUG !== "1"
  ) {
    return Promise.resolve(null);
  }

  if (isLikelyAnalyticsBot()) {
    return Promise.resolve(null);
  }

  clientPromise = whenHumanEngagement()
    .then((ok) => {
      if (!ok) return null;
      return import("posthog-js").then(({ default: posthog }) => {
        posthog.init(token, {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
          ui_host: "https://us.posthog.com",
          defaults: "2026-01-30",
          // Anonymous scrapers inflate "persons"; only mint profiles after identify().
          person_profiles: "identified_only",
          capture_exceptions: false,
          disable_session_recording: true,
          disable_external_dependency_loading: true,
          disable_surveys: true,
          advanced_disable_feature_flags: true,
          capture_performance: false,
          autocapture: false,
          capture_pageview: true,
          capture_pageleave: true,
          persistence: "localStorage+cookie",
          loaded: (client) => {
            client.register({ app: "stockthemes_web", env: process.env.NODE_ENV });
          },
          debug: process.env.NEXT_PUBLIC_POSTHOG_DEBUG === "1",
        });
        return posthog;
      });
    })
    .catch(() => null);

  return clientPromise;
}

export function capturePostHog(
  event: string,
  properties?: Record<string, string | number | boolean | null | undefined>,
): void {
  if (typeof window === "undefined") return;
  void initializePostHog()
    .then((posthog) => {
      posthog?.capture(event, properties);
    })
    .catch(() => {
      /* optional */
    });
}

export async function getPostHogRequestContext(): Promise<{
  distinctId: string;
  sessionId: string;
}> {
  const posthog = await initializePostHog();
  return {
    distinctId: posthog?.get_distinct_id() ?? "",
    sessionId: posthog?.get_session_id() ?? "",
  };
}

export function capturePostHogException(
  error: unknown,
  properties?: Record<string, string | number | boolean | null | undefined>,
): void {
  if (typeof window === "undefined") return;
  void initializePostHog()
    .then((posthog) => posthog?.captureException(error, properties))
    .catch(() => {
      /* optional */
    });
}
