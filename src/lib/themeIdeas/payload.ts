export type ThemeIdeaKind = "new_group" | "theme_in_group";

export type NewGroupPayload = {
  kind: "new_group";
  submitterEmail: string;
  groupName: string;
  themeNames: string[];
  groupNote: string;
};

export type ThemeInGroupPayload = {
  kind: "theme_in_group";
  submitterEmail: string;
  groupSlug: string;
  groupName: string;
  themeName: string;
  tickers: string[];
  themeReasoning: string;
};

export type ThemeIdeaPayload = NewGroupPayload | ThemeInGroupPayload;
