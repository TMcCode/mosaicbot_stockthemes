import type { Provider } from "@supabase/supabase-js";

export type AuthOAuthProviderId = Extract<Provider, "google" | "github" | "apple" | "azure">;

export type AuthOAuthProviderMeta = {
  id: AuthOAuthProviderId;
  label: string;
};

const OAUTH_PROVIDER_META: Record<AuthOAuthProviderId, AuthOAuthProviderMeta> = {
  google: { id: "google", label: "Continue with Google" },
  github: { id: "github", label: "Continue with GitHub" },
  apple: { id: "apple", label: "Continue with Apple" },
  azure: { id: "azure", label: "Continue with Microsoft" },
};

const DEFAULT_PROVIDER_IDS: AuthOAuthProviderId[] = ["google", "github"];

function parseProviderId(raw: string): AuthOAuthProviderId | null {
  const id = raw.trim().toLowerCase();
  if (id in OAUTH_PROVIDER_META) {
    return id as AuthOAuthProviderId;
  }
  return null;
}

/** OAuth buttons on `/sign-in`. Default: Google + GitHub. Set `NEXT_PUBLIC_AUTH_OAUTH_PROVIDERS=none` to hide. */
export function getEnabledAuthOAuthProviders(): AuthOAuthProviderMeta[] {
  const raw = process.env.NEXT_PUBLIC_AUTH_OAUTH_PROVIDERS?.trim();
  if (raw === "none" || raw === "off" || raw === "false") {
    return [];
  }
  const ids = raw
    ? raw.split(",").map(parseProviderId).filter((id): id is AuthOAuthProviderId => id != null)
    : DEFAULT_PROVIDER_IDS;
  return ids.map((id) => OAUTH_PROVIDER_META[id]);
}
