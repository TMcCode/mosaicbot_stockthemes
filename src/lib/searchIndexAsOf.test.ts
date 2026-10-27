import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node's type-stripping test runner requires the source extension.
import {
  parseAsOfFromSearchIndexPrefix,
  searchIndexAsOfNewer,
} from "./searchIndexAsOf.ts";

test("parseAsOfFromSearchIndexPrefix reads leading as_of", () => {
  const prefix =
    '{"schema_version":0,"as_of":"2026-10-27T12:17:30Z","build_id":"x","tickers":[';
  assert.equal(parseAsOfFromSearchIndexPrefix(prefix), "2026-10-27T12:17:30Z");
});

test("searchIndexAsOfNewer compares ISO timestamps", () => {
  assert.equal(
    searchIndexAsOfNewer("2026-10-27T12:17:30Z", "2026-10-27T07:53:05Z"),
    true,
  );
  assert.equal(
    searchIndexAsOfNewer("2026-10-27T07:53:05Z", "2026-10-27T12:17:30Z"),
    false,
  );
  assert.equal(
    searchIndexAsOfNewer("2026-10-27T12:17:30Z", "2026-10-27T12:17:30Z"),
    false,
  );
});
