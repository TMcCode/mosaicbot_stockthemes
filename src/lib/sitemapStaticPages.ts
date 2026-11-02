import type { MetadataRoute } from "next";

/** Indexable hub and trust pages (excludes auth/account). */
export const SITEMAP_STATIC_PATHS: {
  path: string;
  label: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}[] = [
  { path: "/", label: "Home", changeFrequency: "daily", priority: 1 },
  { path: "/groups", label: "All groups", changeFrequency: "daily", priority: 0.9 },
  { path: "/themes", label: "All themes", changeFrequency: "daily", priority: 0.9 },
  { path: "/compare", label: "Theme returns table", changeFrequency: "weekly", priority: 0.8 },
  { path: "/overlay", label: "Theme compare", changeFrequency: "weekly", priority: 0.75 },
  { path: "/feed", label: "Theme activity feed", changeFrequency: "daily", priority: 0.75 },
  { path: "/commentary", label: "Market commentary", changeFrequency: "daily", priority: 0.75 },
  { path: "/docs", label: "Documentation", changeFrequency: "monthly", priority: 0.55 },
  { path: "/docs/about", label: "About", changeFrequency: "monthly", priority: 0.5 },
  { path: "/docs/methodology", label: "Methodology", changeFrequency: "monthly", priority: 0.5 },
  { path: "/docs/factors", label: "Factors", changeFrequency: "monthly", priority: 0.5 },
  { path: "/docs/roadmap", label: "Roadmap", changeFrequency: "monthly", priority: 0.5 },
  { path: "/docs/roadmap/data", label: "Data roadmap", changeFrequency: "monthly", priority: 0.4 },
  { path: "/contact", label: "Contact", changeFrequency: "yearly", priority: 0.4 },
  { path: "/privacy", label: "Privacy policy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", label: "Terms of service", changeFrequency: "yearly", priority: 0.3 },
  { path: "/cookie-policy", label: "Cookie policy", changeFrequency: "yearly", priority: 0.3 },
];
