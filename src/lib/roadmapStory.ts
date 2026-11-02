/**
 * Roadmap story for `/docs/roadmap`:
 * Data/compute/news strengthen the platform → that platform forks into
 * (1) Stockthemes research and (2) Blast Radius.
 * Dataset queue detail: `/docs/roadmap/data`.
 */

export const ROADMAP_PAGE_INTRO =
  "Better data, compute, and market-driving news make the platform sharper. That platform then splits into two products: Stockthemes, and Blast Radius—simulation on the same curated map. Subscriber support funds the build order; this is direction, not a ship date.";

export type RoadmapFoundation = {
  id: string;
  title: string;
  lede: string;
  bullets: string[];
  cta: { href: string; label: string };
};

export const ROADMAP_FOUNDATION: RoadmapFoundation = {
  id: "platform",
  title: "Data, compute, and market-driving news",
  lede:
    "These inputs improve the whole platform—theme quality, how fast we can curate, and whether the right catalyst lands on the right basket.",
  bullets: [
    "More datasets behind each theme (macro, labor, attention, contracts, trade) so the backdrop is not just lagged government prints.",
    "More compute through transcripts and filings to curate and refresh theme membership with evidence, not vibes.",
    "Sharper news: fewer generic headlines, more catalysts tied to themes and tickers when they matter.",
  ],
  cta: {
    href: "/docs/roadmap/data",
    label: "See the data queue — order and why",
  },
};

export type RoadmapProng = {
  id: string;
  title: string;
  lede: string;
  bullets: string[];
};

/** Sibling products that sit on the improved platform—not a sequence after each other. */
export const ROADMAP_PRONGS: RoadmapProng[] = [
  {
    id: "research",
    title: "Stockthemes",
    lede:
      "Sector expertise that tracks themes over time and writes about what is changing—plus the factor work that shows what is actually moving a stock, theme, or portfolio.",
    bullets: [
      "Analysts (and tooling that backs them) who own theme verticals: what moved, what matters next, what the basket is missing.",
      "Factor reads on themes and names—market, style, sector, narrative—so a move is not mistaken for pure thesis when it was mostly beta or growth.",
      "Commentary grounded in the same curated universes and factor context you already browse—not a generic AI wrap of the tape.",
      "A path from “check the theme” to “someone is on this narrative continuously,” including what is driving the P&L.",
    ],
  },
  {
    id: "blast-radius",
    title: "Blast Radius",
    lede:
      "Simulation / forecasting on that same map: ask how an event hits themes and tickers—or how a theme, group, or ticker fares under a shock.",
    bullets: [
      "Event → map: “What themes and tickers look most exposed to this event?”",
      "Subject → shocks: “How would this theme, group, or ticker be hit by Y?”",
      "A full market map of the curated universe—groups, themes, and constituents in one navigable mosaic—so blast answers have a place to land, not just a ranked list.",
      "Answer surface: that map colored by estimated impact—positive vs negative tilt by theme and names—not a flat ticker dump.",
    ],
  },
];

export const ROADMAP_FORK_LABEL = "Two products on that platform";

export type BlastQueryMode = {
  id: string;
  title: string;
  prompt: string;
  result: string;
};

/** Twin query modes shown under the Blast Radius prong. */
export const BLAST_QUERY_MODES: BlastQueryMode[] = [
  {
    id: "event-to-map",
    title: "Event → themes & tickers",
    prompt: "What would a Strait of Hormuz disruption hit?",
    result: "Themes and names ranked by exposure on the market map",
  },
  {
    id: "subject-to-event",
    title: "Theme / ticker → event",
    prompt: "How does Solar Developers fare if IRA credits slip?",
    result: "That basket’s map, colored by estimated impact",
  },
];

/** Lanes on `/docs/roadmap/data` — order is the story; `itemIds` join baked roadmap JSON. */
export type RoadmapDataLane = {
  id: string;
  title: string;
  why: string;
  itemIds: string[];
};

export const ROADMAP_DATA_LANES: RoadmapDataLane[] = [
  {
    id: "news-catalysts",
    title: "Acute, market-driving news",
    why: "Breadth and structure first so catalysts can attach to themes instead of floating as a generic feed.",
    itemIds: ["newsapi", "news_entity_graph", "reddit_social_sourcing"],
  },
  {
    id: "transcripts-curation",
    title: "Transcripts & theme curation compute",
    why: "Throughput through earnings and filings is how membership stays evidence-based as narratives evolve.",
    itemIds: ["transcript_catalyst_depth", "ticker_screener"],
  },
  {
    id: "theme-backdrop",
    title: "Theme backdrop datasets",
    why: "Leading and concurrent signals—attention, labor, government spend—so each theme’s data layer updates when the world does.",
    itemIds: [
      "ticker_trends_dataset",
      "workforce_signals",
      "government_spend_dataset",
      "usaspending_contracts",
      "alt_transaction_data",
    ],
  },
  {
    id: "blast-matrices",
    title: "Exposure matrices for Blast Radius",
    why: "Trade, commodities, regulation, and supply chain give the simulation something geometric to score against—not just keyword overlap.",
    itemIds: [
      "trade_flow_comtrade",
      "commodity_exposure_matrix",
      "regulatory_pipeline",
      "panjiva",
      "patents_ip_clustering",
      "satellite_geospatial",
    ],
  },
  {
    id: "platform-capacity",
    title: "Platform, premium data & team",
    why: "Real-time plumbing, premium research feeds, and hiring unlock depth once the core lanes above are funded.",
    itemIds: [
      "realtime_stock_platform",
      "perf_refactor",
      "bloomberg_terminal",
      "visible_alpha",
      "alphasense",
      "hire_backend",
      "hire_ai_analyst",
      "web_scraper",
    ],
  },
];

export const ROADMAP_DISCLAIMER =
  "Direction and funding targets—not a delivery schedule, and not investment advice.";

/** “How it funds” on `/docs/roadmap` (common language). */
export const ROADMAP_FUNDING_OPEN =
  "Plainly: the more people who subscribe, the more data and compute I can buy. News feeds, transcript throughput, labor and attention datasets, trade and commodity matrices—none of that is free, and each one makes Stockthemes and Blast Radius more useful.";

export const ROADMAP_FUNDING_MAP_BEFORE_LINK =
  "I have a rough map of how many paid subscribers unlock which kind of data, and in what order. That queue—with why each lane comes when it does—is on the";

export const ROADMAP_FUNDING_USEFUL =
  "What the data is for: sharper theme baskets, catalysts that actually attach to the right names, factor context for what moved a stock or theme, and the exposure matrices Blast Radius needs so an event can light up a market map instead of a guess.";

/** Live vendor stack shown under “How it funds”. */
export const ROADMAP_CURRENT_SUBSCRIPTIONS: { name: string; use: string }[] = [
  { name: "NewsAPI.ai", use: "news" },
  { name: "FMP", use: "fundamentals, transcripts" },
  { name: "EODHD", use: "market pricing" },
  { name: "Trading Economics", use: "background data" },
];
