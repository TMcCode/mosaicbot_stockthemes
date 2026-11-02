/** Static copy for the Vision section on `/docs/about`. */

export const ABOUT_VISION_PARAGRAPHS = [
  "stockthemes.ai is a next-gen thematic research platform—providing the story layer of the market. Investors already think in narratives; this is the layer that makes that view concrete: curated theme baskets, the evidence behind each story, factor context for what is actually moving, and which names in the basket are most exposed when a theme runs.",
  "That layer is live today—search, themes, stock pages, News Radar, factors, and commentary. The work ahead is making it denser and faster: more free government, industry, and scraped data (paid datasets as the platform grows), realtime market feeds, and deeper company context from investor days, conferences, podcasts, and expert networks—not earnings alone—so synthesis can keep up. Deeper expert analysis follows the same path. The first step toward Blast Radius is finishing the map: richer theme and ticker coverage so an event has somewhere precise to land.",
] as const;

/** Planned / not yet public — shown above Recently shipped. */
/** Planned / not yet public — shown above Recently shipped. */
export const ABOUT_VISION_UPCOMING = [
  {
    date: "Feb 2027",
    dateTime: "2027-02",
    title: "Theme Context (beta)",
    body: "Live backdrop scores and charts behind the narrative—built from hundreds of backtested, thesis-relevant datasets. Beta covers ~400 themes; more packs and denser history as the data queue funds.",
  },
  {
    date: "Dec 2026",
    dateTime: "2026-12",
    title: "Theme screener",
    body: "Find themes and tickers inflecting early—momentum, revisions, and setup filters across the basket map.",
  },
  {
    date: "Nov 2026",
    dateTime: "2026-11",
    title: "Improved watchlist",
    body: "A tighter watchlist for themes and tickers—cleaner follow, alerts, and day-to-day review of what you’re tracking.",
  },
] as const;

/** Shipped recently — newest first. Dates are approximate first public ship. */
export const ABOUT_VISION_RECENT = [
  {
    date: "Oct 2026",
    dateTime: "2026-10",
    title: "Stock pages",
    body: "A page for every name in the universe—theme membership, performance, and company context in one place.",
  },
  {
    date: "Oct 2026",
    dateTime: "2026-10",
    title: "Closest sector signal",
    body: "Which industry factor a theme actually tracks after market overlap—sometimes not the label you’d guess.",
  },
  {
    date: "Sep 2026",
    dateTime: "2026-09",
    title: "News Radar",
    body: "Market-driving headlines attached to themes and tickers, not a generic news firehose.",
  },
  {
    date: "May 2026",
    dateTime: "2026-05",
    title: "Factor profiles",
    body: "Market, style, sector, and narrative factor reads so a move isn’t mistaken for pure thesis when it was mostly beta or growth.",
  },
  {
    date: "May 2026",
    dateTime: "2026-05",
    title: "Theme theses",
    body: "A written thesis on every theme so the narrative is explicit—not inferred from the ticker list alone.",
  },
  {
    date: "May 2026",
    dateTime: "2026-05",
    title: "Suggest an edit",
    body: "Propose basket changes; every submission is reviewed by hand.",
  },
] as const;
