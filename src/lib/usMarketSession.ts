const ET_SESSION_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
  hour: "numeric",
  minute: "numeric",
  hourCycle: "h23",
});

function etWeekdayMins(at: Date): { weekday: string; mins: number } | null {
  const parts = ET_SESSION_PARTS.formatToParts(at);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value);
  const minute = Number(parts.find((p) => p.type === "minute")?.value);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return { weekday, mins: hour * 60 + minute };
}

/** US premarket session: 4:00–9:30 AM ET on weekdays. */
export function isUsPremarketSession(at: Date = new Date()): boolean {
  const et = etWeekdayMins(at);
  if (!et || et.weekday === "Sat" || et.weekday === "Sun") return false;
  return et.mins >= 4 * 60 && et.mins < 9 * 60 + 30;
}

/** US post-market session: 4:30–10:00 PM ET on weekdays. */
export function isUsPostmarketSession(at: Date = new Date()): boolean {
  const et = etWeekdayMins(at);
  if (!et || et.weekday === "Sat" || et.weekday === "Sun") return false;
  return et.mins >= 16 * 60 + 30 && et.mins <= 22 * 60;
}

export function shouldShowPremarketColumn(at: Date = new Date()): boolean {
  return isUsPremarketSession(at);
}

export function shouldShowPostmarketColumn(at: Date = new Date()): boolean {
  return isUsPostmarketSession(at);
}

/** Drop Premarket/Postmarket columns outside their active ET sessions. */
export function withoutSessionOnlyColumnsUnlessActive<T extends string>(
  cols: readonly T[],
  at: Date = new Date(),
): T[] {
  let out = [...cols];
  if (!shouldShowPremarketColumn(at)) {
    out = out.filter((c) => c !== "Premarket");
  }
  if (!shouldShowPostmarketColumn(at)) {
    out = out.filter((c) => c !== "Postmarket");
  }
  return out;
}

/** @deprecated Prefer withoutSessionOnlyColumnsUnlessActive */
export function withoutPremarketUnlessActive<T extends string>(
  cols: readonly T[],
  at: Date = new Date(),
): T[] {
  return withoutSessionOnlyColumnsUnlessActive(cols, at);
}
