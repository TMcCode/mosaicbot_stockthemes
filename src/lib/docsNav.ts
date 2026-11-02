/** Docs sidebar + hub cards — keep tiny and static so `/docs` stays light. */

export type DocsNavItem = {
  href: string;
  label: string;
  /** One-line blurb for the `/docs` hub cards. */
  summary: string;
};

export const DOCS_NAV: DocsNavItem[] = [
  {
    href: "/docs/about",
    label: "About",
    summary: "Why stockthemes.ai exists, how theme baskets are built, and where the product is headed.",
  },
  {
    href: "/docs/methodology",
    label: "Methodology",
    summary: "Construction rules, weights, return math, refresh cadence, and limitations.",
  },
  {
    href: "/docs/factors",
    label: "Factors",
    summary: "Why factor exposures matter and how to read Higher / Lower scores on theme pages.",
  },
  {
    href: "/docs/roadmap",
    label: "Roadmap",
    summary: "Stronger data platform, forking into Stockthemes and Blast Radius.",
  },
];
