import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node's type-stripping test runner requires the source extension.
import { buildCloseMoversBoard } from "./buildCloseMoversBoard.ts";
import type { TopMoverTickerItem } from "./buildTopMoversTicker.ts";
import type { RadarNewsV0 } from "../types/radar_news.v0.ts";

function item(
  slug: string,
  tier: "top" | "bottom",
  rank: number,
  pct: number,
): TopMoverTickerItem {
  return { slug, name: slug, tier, rank, returnPct: pct };
}

test("builds top/bottom 10 with ≤2 headlines from today+prior only", () => {
  const items: TopMoverTickerItem[] = [
    ...Array.from({ length: 12 }, (_, i) => item(`top-${i + 1}`, "top", i + 1, 5 - i * 0.1)),
    ...Array.from({ length: 12 }, (_, i) =>
      item(`bot-${i + 1}`, "bottom", i + 1, -1 - i * 0.1),
    ),
  ];
  const news = {
    schema_version: 0,
    as_of: "2026-10-28",
    today: {
      as_of: "2026-10-28",
      home: [],
      all: [
        {
          slug: "top-1",
          name: "Top 1",
          hits_14d: 2,
          headlines: [
            { title: "A", url: "https://a.example/1", published_at: "2026-10-28T12:00:00Z" },
            { title: "B", url: "https://a.example/2", published_at: "2026-10-28T13:00:00Z" },
            { title: "C", url: "https://a.example/3", published_at: "2026-10-28T14:00:00Z" },
          ],
          tickers_preview: [],
        },
      ],
    },
    history: [
      {
        as_of: "2026-10-27",
        home: [],
        all: [
          {
            slug: "bot-1",
            name: "Bot 1",
            hits_14d: 1,
            headlines: [
              {
                title: "Prior",
                url: "https://b.example/1",
                published_at: "2026-10-27T12:00:00Z",
                source_name: "Wire",
              },
            ],
            tickers_preview: [],
          },
        ],
      },
      {
        as_of: "2026-10-20",
        home: [],
        all: [
          {
            slug: "bot-2",
            name: "Bot 2",
            hits_14d: 1,
            headlines: [
              {
                title: "Too old",
                url: "https://old.example/1",
                published_at: "2026-10-20T12:00:00Z",
              },
            ],
            tickers_preview: [],
          },
        ],
      },
    ],
  } as RadarNewsV0;

  const board = buildCloseMoversBoard(items, news, { n: 10, maxHeadlines: 2 });
  assert.ok(board);
  assert.equal(board!.top.length, 10);
  assert.equal(board!.bottom.length, 10);
  assert.equal(board!.top[0].slug, "top-1");
  assert.equal(board!.top[0].headlines.length, 2);
  assert.equal(board!.top[0].headlines[0].title, "A");
  assert.equal(board!.bottom[0].slug, "bot-1");
  assert.equal(board!.bottom[0].headlines.length, 1);
  assert.equal(board!.bottom[0].headlines[0].sourceName, "Wire");
  assert.equal(board!.bottom[1].headlines.length, 0); // older history ignored
  assert.equal(board!.top[1].headlines.length, 0);
});
