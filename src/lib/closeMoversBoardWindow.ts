/** Home close board: post regular close (16:00 ET) until next trading morning 04:00 ET. */

const ET_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

type EtParts = {
  weekday: string;
  hour: number;
  minute: number;
};

function etParts(at: Date): EtParts {
  const bag: Record<string, string> = {};
  for (const p of ET_PARTS.formatToParts(at)) {
    if (p.type !== "literal") bag[p.type] = p.value;
  }
  return {
    weekday: bag.weekday || "",
    hour: Number(bag.hour),
    minute: Number(bag.minute),
  };
}

/**
 * True from a weekday 16:00 ET through the next morning 03:59 ET.
 * Fri close → Sat 04:00 hide. Hidden Sun, Mon–Fri before close, and Mon 00:00–03:59.
 */
export function isCloseMoversBoardWindow(at: Date = new Date()): boolean {
  const p = etParts(at);
  const mins = p.hour * 60 + p.minute;

  if (p.weekday === "Sat") {
    // Overnight from Friday close only.
    return mins < 4 * 60;
  }
  if (p.weekday === "Sun") return false;

  // Mon–Fri
  if (mins >= 16 * 60) return true;
  // Tue–Fri early morning = prior weekday overnight; Mon early is post-weekend.
  if (mins < 4 * 60 && p.weekday !== "Mon") return true;
  return false;
}
