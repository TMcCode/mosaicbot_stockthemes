import { NextRequest, NextResponse } from "next/server";

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

  if (beehiivRes.ok) {
    return NextResponse.json({ ok: true as const });
  }

  if (beehiivRes.status === 429) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 }
    );
  }

  return NextResponse.json({ error: "Could not subscribe right now." }, { status: 502 });
}
