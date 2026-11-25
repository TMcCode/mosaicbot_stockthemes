/** Copy for `/docs/how-to` — keep in sync with the home first-job language. */

export type HowToSection = {
  id: string;
  title: string;
  body: string[];
};

export const HOW_TO_INTRO =
  "Start with a stock or theme you care about. Search opens the map of what you’re exposed to; sign in when you want the analyst desk and a theme watchlist. Nothing here is investment advice.";

export const HOW_TO_SECTIONS: HowToSection[] = [
  {
    id: "start-with-search",
    title: "1. Type a stock or theme keyword",
    body: [
      "On the home page, use search the same way the hero asks: enter a ticker you own or follow, or a theme keyword (robotics, data centers, semis…). That is the first job — not browsing every dashboard.",
      "Stock pages show which themes the name sits in (chips + heatmap) for everyone, signed in or not. That list answers “what story am I actually exposed to?”",
    ],
  },
  {
    id: "map-your-stocks",
    title: "2. Read the theme map, then open a theme",
    body: [
      "From a stock page, click a membership chip or a heatmap tile to open that theme. On the theme page you’ll see constituents, performance, and (when signed in) thesis, factors, earnings, revenue, and notes.",
      "Guests get the map and returns context free. Sign in free when you want the analyst desk on that theme or ticker.",
    ],
  },
  {
    id: "watchlist-loop",
    title: "3. Keep a short theme watchlist",
    body: [
      "Signed in, star the themes that matter for your process — not every basket in the catalog. Search “watchlist” to jump to My watchlist.",
      "Each session: glance Most talked about or your watchlist → open anything that moved → read news, thesis, and factors on that theme. Aim for a short, repeatable loop.",
    ],
  },
  {
    id: "verify-performance",
    title: "4. Separate “what’s working” from “what you like”",
    body: [
      "Use the Theme returns table to see what is actually leading. Cross-check Most talked about for breadth and revisions — conversation heat, not a buy list.",
      "When signed in, filter compare to My Watchlist or Most talked about so you rank a focused set, not the entire catalog.",
    ],
  },
  {
    id: "desk-and-docs",
    title: "5. Use the desk + docs so the process compounds",
    body: [
      "Read From the desk for editorial pulse. Use methodology and factors docs when a chart looks too clean or a factor tilt surprises you.",
      "The edge is the loop — search → map → watch → verify — repeated, not another tab of unread links.",
    ],
  },
];

export const HOW_TO_FOOTNOTE =
  "Home tagline: See the Forest for the Themes. First action: type a stock or theme keyword. Videos and a shorter walkthrough will land here next.";
