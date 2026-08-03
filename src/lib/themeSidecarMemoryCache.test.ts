import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node's type-stripping test runner requires the source extension.
import {
  getThemeSidecarMemory,
  isThemeSidecarTerminalStatus,
  setThemeSidecarMemory,
  themeSidecarCacheKey,
} from "./themeSidecarMemoryCache.ts";

test("themeSidecarCacheKey normalizes trailing slash", () => {
  assert.equal(
    themeSidecarCacheKey("https://storage.example/data/", "ai"),
    themeSidecarCacheKey("https://storage.example/data", "ai"),
  );
});

test("memory cache round-trips terminal sidecar states", () => {
  const key = themeSidecarCacheKey("https://storage.example", "edu");
  const ns = `test-${Date.now()}`;
  assert.equal(getThemeSidecarMemory(ns, key), undefined);
  setThemeSidecarMemory(ns, key, { status: "ok", data: { slug: "edu" } });
  assert.deepEqual(getThemeSidecarMemory(ns, key), { status: "ok", data: { slug: "edu" } });
  assert.equal(isThemeSidecarTerminalStatus("ok"), true);
  assert.equal(isThemeSidecarTerminalStatus("loading"), false);
});
