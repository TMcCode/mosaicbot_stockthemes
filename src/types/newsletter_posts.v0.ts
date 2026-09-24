/** Baked Field of Themes + Alt Data Observer posts (`newsletter_posts.v0.json`). */

export type NewsletterPostSourceV0 = "beehiiv" | "substack";

export type NewsletterPostV0 = {
  id: string;
  source: NewsletterPostSourceV0;
  source_label: string;
  title: string;
  url: string;
  published_at?: string | null;
  subtitle?: string | null;
  /** Hero / social thumbnail when the source provides one. */
  image_url?: string | null;
};

export type NewsletterPostsV0 = {
  schema_version: 0;
  as_of: string;
  sources?: {
    beehiiv?: string;
    substack?: string;
    substack_feed?: string;
  };
  posts: NewsletterPostV0[];
};
