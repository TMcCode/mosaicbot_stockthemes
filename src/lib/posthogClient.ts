export function capturePostHog(
  event: string,
  properties?: Record<string, string | number | boolean | null | undefined>,
): void {
  if (typeof window === "undefined") return;
  void import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.capture(event, properties);
    })
    .catch(() => {
      /* optional */
    });
}
