/** Rough draft for `/docs/how-to` — edit freely; not investment advice. */

export type HowToSection = {
  id: string;
  title: string;
  body: string[];
};

export const HOW_TO_INTRO =
  "stockthemes.ai is a thematic investing toolkit: hand-built theme baskets, stock membership maps, performance tables, and editorial context. Use it to understand what is moving your names — and to check narratives against returns — not as a trade ticket. Nothing here is investment advice.";

export const HOW_TO_SECTIONS: HowToSection[] = [
  {
    id: "map-your-stocks",
    title: "1. Find the themes inside your stocks",
    body: [
      "Start with search. Type a ticker you own or follow, open the stock page, and scan which themes it sits in. That list is the map of “what story am I actually exposed to?”",
      "Star the themes that matter for your process; ignore the rest. The goal is to stop treating a stock as one bet when it is several theme bets stacked.",
    ],
  },
  {
    id: "watchlist-loop",
    title: "2. Keep a short watchlist, then check it like a desk",
    body: [
      "Do not track the whole universe. Keep a tight theme watchlist — the names you would actually trade, stress about, or need to explain.",
      "Each session: glance Most talked about (or your watchlist when you use it) → open anything that moved → read news, thesis, and factors on that theme page. Aim for a repeatable ten-minute loop instead of doomscrolling.",
    ],
  },
  {
    id: "verify-performance",
    title: "3. Separate “what’s working” from “what you like”",
    body: [
      "Use the Theme returns table (and Top performers → 3M) to see what is actually leading. Cross-check Most talked about for breadth and revisions — conversation heat, not a buy list — not just a hot one-day print.",
      "When you are signed in, filter compare to My Watchlist or Most talked about so you are ranking a focused set, not the entire catalog.",
    ],
  },
  {
    id: "desk-and-docs",
    title: "4. Use the desk + docs so the process compounds",
    body: [
      "Read From the desk for the editorial pulse. Use methodology and factors docs when a chart looks too clean or a factor tilt surprises you.",
      "The edge is the loop — map → watch → verify → size — repeated, not another tab of unread links.",
    ],
  },
];

export const HOW_TO_FOOTNOTE =
  "Videos and a shorter “first five minutes” walkthrough will land on this page next. Until then, this written loop is the intended way to use the site.";
