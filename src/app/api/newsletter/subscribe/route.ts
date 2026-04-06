import { NextRequest, NextResponse } from "next/server";
import { getPostHogClient } from "@/lib/posthog-server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const apiKey = process.env.BEEHIIV_API_KEY?.trim();
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID?.trim();
  if (!apiKey || !publicationId) {
    return NextResponse.json({ error: "Newsletter not configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const raw =
    typeof body === "object" && body !== null && "email" in body
      ? String((body as { email?: unknown }).email ?? "").trim().toLowerCase()
      : "";
  if (!raw || !EMAIL_RE.test(raw)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const referring =
    req.headers.get("referer")?.slice(0, 512) ??
    req.headers.get("referrer")?.slice(0, 512);
  const clientDistinctId = req.headers.get("x-posthog-distinct-id")?.trim() || null;
  const clientSessionId = req.headers.get("x-posthog-session-id")?.trim() || null;
  const distinctId = clientDistinctId ?? raw;

  const beehiivRes = await fetch(
    `https://api.beehiiv.com/v2/publications/${encodeURIComponent(publicationId)}/subscriptions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: raw,
        send_welcome_email: true,
        tier: "free",
        utm_source: "stockthemes.ai",
        utm_medium: "website",
        ...(referring ? { referring_site: referring } : {}),
      }),
    }
  );

  const posthog = getPostHogClient();

  if (beehiivRes.ok) {
    posthog.capture({
      distinctId,
      event: "newsletter_subscribed",
      properties: {
        ...(clientSessionId ? { $session_id: clientSessionId } : {}),
        referring_url: referring ?? null,
      },
    });
    return NextResponse.json({ ok: true as const });
  }

  if (beehiivRes.status === 429) {
    posthog.capture({
      distinctId,
      event: "newsletter_subscribe_failed",
      properties: { reason: "rate_limited", http_status: 429 },
    });
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 }
    );
  }

  posthog.capture({
    distinctId,
    event: "newsletter_subscribe_failed",
    properties: { reason: "beehiiv_error", http_status: beehiivRes.status },
  });
  return NextResponse.json({ error: "Could not subscribe right now." }, { status: 502 });
}
