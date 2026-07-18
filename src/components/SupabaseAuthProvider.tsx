"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

import { getSupabasePublicConfig } from "@/lib/supabase/config";

type SupabaseAuthContextValue = {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  signOut: () => Promise<void>;
};

const SupabaseAuthContext = createContext<SupabaseAuthContextValue | null>(null);

export function useSupabaseAuth(): SupabaseAuthContextValue {
  const ctx = useContext(SupabaseAuthContext);
  if (!ctx) {
    throw new Error("useSupabaseAuth must be used within SupabaseAuthProvider");
  }
  return ctx;
}

export function useOptionalSupabaseAuth(): SupabaseAuthContextValue {
  const ctx = useContext(SupabaseAuthContext);
  if (!ctx) {
    return {
      configured: false,
      loading: false,
      session: null,
      user: null,
      signOut: async () => {},
    };
  }
  return ctx;
}

function posthogIdentify(user: User) {
  if (typeof window === "undefined") return;
  void import("posthog-js")
    .then(({ default: posthog }) => {
      const id = user.id;
      const email = user.email ?? undefined;
      posthog.identify(id, email ? { email } : undefined);
    })
    .catch(() => {
      /* optional */
    });
}

function posthogReset() {
  if (typeof window === "undefined") return;
  void import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.reset();
    })
    .catch(() => {
      /* optional */
    });
}

/** First magic-link completion: account created within the last 2 minutes. */
function isNewSignupUser(user: User): boolean {
  const createdMs = Date.parse(user.created_at);
  if (Number.isNaN(createdMs)) return false;
  return Date.now() - createdMs < 120_000;
}

function captureAuthPostHog(user: User) {
  if (typeof window === "undefined") return;
  void import("posthog-js")
    .then(({ default: posthog }) => {
      const email = user.email ?? undefined;
      posthog.identify(user.id, email ? { email } : undefined);
      const isNewUser = isNewSignupUser(user);
      posthog.capture("sign_in", { is_new_user: isNewUser });
      if (isNewUser) {
        posthog.capture("sign_up");
      }
    })
    .catch(() => {
      /* optional */
    });
}

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const configured = useMemo(() => Boolean(getSupabasePublicConfig()), []);
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [loading, setLoading] = useState(configured);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    void import("@/lib/supabase/browserClient").then(({ getBrowserSupabase }) => {
      if (!cancelled) setClient(getBrowserSupabase());
    });
    return () => {
      cancelled = true;
    };
  }, [configured]);

  useEffect(() => {
    if (!configured) return;
    if (!client) {
      return;
    }

    let settled = false;

    const finishLoading = () => {
      if (settled) return;
      settled = true;
      setLoading(false);
    };

    const failSafe = window.setTimeout(finishLoading, 1500);

    void client.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        setSession(s);
        if (s?.user) {
          posthogIdentify(s.user);
        }
      })
      .catch(() => {
        setSession(null);
      })
      .finally(() => {
        window.clearTimeout(failSafe);
        finishLoading();
      });

    const { data: unsub } = client.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      finishLoading();
      if (_event === "SIGNED_IN" && s?.user) {
        captureAuthPostHog(s.user);
      }
      if (_event === "SIGNED_OUT") {
        posthogReset();
      }
    });
    return () => {
      window.clearTimeout(failSafe);
      unsub?.subscription.unsubscribe();
    };
  }, [client, configured]);

  const signOut = useCallback(async () => {
    if (!client) return;
    await client.auth.signOut();
    posthogReset();
    setSession(null);
  }, [client]);

  const value = useMemo<SupabaseAuthContextValue>(
    () => ({
      configured,
      loading,
      session,
      user: session?.user ?? null,
      signOut,
    }),
    [configured, loading, session, signOut],
  );

  return <SupabaseAuthContext.Provider value={value}>{children}</SupabaseAuthContext.Provider>;
}
