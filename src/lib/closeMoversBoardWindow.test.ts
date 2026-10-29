import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node's type-stripping test runner requires the source extension.
import { isCloseMoversBoardWindow } from "./closeMoversBoardWindow.ts";

/** Construct a Date whose America/New_York wall time matches the args. */
function etDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
): Date {
  const pad = (n: number) => String(n).padStart(2, "0");
  // Interpret as UTC then shift — use Date with explicit ET offset via ISO.
  // America/New_York is UTC-4 (EDT) for these October fixtures.
  const utcHour = hour + 4;
  return new Date(
    `${year}-${pad(month)}-${pad(day)}T${pad(utcHour)}:${pad(minute)}:00.000Z`,
  );
}

test("hidden mid-session weekday", () => {
  // Wed 2026-10-28 12:00 ET
  assert.equal(isCloseMoversBoardWindow(etDate(2026, 10, 28, 12)), false);
});

test("open after weekday close", () => {
  assert.equal(isCloseMoversBoardWindow(etDate(2026, 10, 28, 16, 5)), true);
});

test("open Tue early morning from Mon close", () => {
  // Tue 2026-10-27 was Mon... use Tue Oct 28 early? Oct 28 2026 is Wednesday.
  // Tue 2026-10-27 02:00 ET
  assert.equal(isCloseMoversBoardWindow(etDate(2026, 10, 27, 2)), true);
});

test("hidden Mon early morning (post-weekend)", () => {
  // Mon 2026-10-26 02:00 ET
  assert.equal(isCloseMoversBoardWindow(etDate(2026, 10, 26, 2)), false);
});

test("Fri close open; Sat before 4a open; Sat after 4a closed; Sun closed", () => {
  assert.equal(isCloseMoversBoardWindow(etDate(2026, 10, 30, 17)), true); // Fri
  assert.equal(isCloseMoversBoardWindow(etDate(2026, 10, 31, 2)), true); // Sat early
  assert.equal(isCloseMoversBoardWindow(etDate(2026, 10, 31, 5)), false); // Sat after 4a
  assert.equal(isCloseMoversBoardWindow(etDate(2026, 11, 1, 2)), false); // Sun
});
