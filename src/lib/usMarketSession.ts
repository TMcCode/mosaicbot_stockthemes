const ET_SESSION_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
  hour: "numeric",
  minute: "numeric",
  hourCycle: "h23",
});

/** US premarket session: 4:00–9:30 AM ET on weekdays. */
export function isUsPremarketSession(at: Date = new Date()): boolean {
  const parts = ET_SESSION_PARTS.formatToParts(at);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  if (weekday === "Sat" || weekday === "Sun") return false;

  const hour = Number(parts.find((p) => p.type === "hour")?.value);
  const minute = Number(parts.find((p) => p.type === "minute")?.value);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return false;

  const mins = hour * 60 + minute;
  return mins >= 4 * 60 && mins < 9 * 60 + 30;
}

export function shouldShowPremarketColumn(at: Date = new Date()): boolean {
  return isUsPremarketSession(at);
}

export function withoutPremarketUnlessActive<T extends string>(
  cols: readonly T[],
  at: Date = new Date(),
): T[] {
  if (shouldShowPremarketColumn(at)) return [...cols];
  return cols.filter((c) => c !== "Premarket");
}
