export type ThemeSlugRedirectsV0 = {
  schema_version: 0;
  as_of?: string | null;
  /** old_slug → new_slug */
  redirects: Record<string, string>;
  /** new_slug → former names / old slugs for search */
  alias_names?: Record<string, string[]>;
};
