type PostHogClient = typeof import("posthog-js")["default"];

let clientPromise: Promise<PostHogClient | null> | null = null;

export function initializePostHog(): Promise<PostHogClient | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (clientPromise) return clientPromise;

  const token =
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN ?? process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!token) return Promise.resolve(null);

  clientPromise = import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.init(token, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
        ui_host: "https://us.posthog.com",
        defaults: "2026-01-30",
        capture_exceptions: false,
        disable_session_recording: true,
        disable_external_dependency_loading: true,
        disable_surveys: true,
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
