/** Canonical sidecar: themes/<slug>.notes.v0.json */
export type ThemeNotesConstituentV0 = {
  ticker: string;
  ticker_note: string;
};

export type ThemeNotesV0 = {
  schema_version: "theme.notes.v0";
  slug: string;
  name: string;
  as_of: string;
  build_id?: string;
  constituents: ThemeNotesConstituentV0[];
};
