import { initializePostHog } from "@/lib/posthogClient";

const startAnalytics = () => void initializePostHog();

if (typeof requestIdleCallback === "function") {
  requestIdleCallback(startAnalytics, { timeout: 2500 });
} else {
  setTimeout(startAnalytics, 1500);
}
