"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { readLikelySupabaseSession } from "@/lib/supabase/likelySession";

type SupabaseAuthContextValue = {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  /**
   * Optimistic: localStorage had a session when checked before paint.
   * Cleared once getSession settles as guest (so stale tokens don’t keep gated UI up).
   */
  presumeSignedIn: boolean;
  /** Confirmed user, or still loading with a likely persisted session. */
  showAuthedUi: boolean;
  signOut: () => Promise<void>;
};

const SupabaseAuthContext = createContext<SupabaseAuthContextValue | null>(null);

const GUEST_FALLBACK: SupabaseAuthContextValue = {
  configured: false,
  loading: false,
  session: null,
  user: null,
  presumeSignedIn: false,
  showAuthedUi: false,
  signOut: async () => {},
};

/** Keep supabase-js out of the initial JS budget; start the chunk ASAP on the client. */
let browserClientPromise: Promise<SupabaseClient | null> | null = null;

function loadBrowserSupabase(): Promise<SupabaseClient | null> {
  if (!browserClientPromise) {
    browserClientPromise = import("@/lib/supabase/browserClient").then((m) => m.getBrowserSupabase());
  }
  return browserClientPromise;
}

export function useSupabaseAuth(): SupabaseAuthContextValue {
  const ctx = useContext(SupabaseAuthContext);
  if (!ctx) {
    throw new Error("useSupabaseAuth must be used within SupabaseAuthProvider");
  }
  return ctx;
}

export function useOptionalSupabaseAuth(): SupabaseAuthContextValue {
  const ctx = useContext(SupabaseAuthContext);
  return ctx ?? GUEST_FALLBACK;
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
  const [presumeSignedIn, setPresumeSignedIn] = useState(false);

  // Before paint: unlock gated UI for returning users; kick off supabase chunk immediately.
  useLayoutEffect(() => {
    if (!configured) return;
    setPresumeSignedIn(readLikelySupabaseSession());
    let cancelled = false;
    void loadBrowserSupabase().then((c) => {
      if (!cancelled) setClient(c);
    });
    return () => {
      cancelled = true;
    };
  }, [configured]);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
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
          setPresumeSignedIn(true);
          posthogIdentify(s.user);
        } else {
          setPresumeSignedIn(false);
        }
      })
      .catch(() => {
        setSession(null);
        setPresumeSignedIn(false);
      })
      .finally(() => {
        window.clearTimeout(failSafe);
        finishLoading();
      });

    const { data: unsub } = client.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setPresumeSignedIn(Boolean(s?.user));
      finishLoading();
      if (_event === "SIGNED_IN" && s?.user) {
        captureAuthPostHog(s.user);
      }
      if (_event === "SIGNED_OUT") {
        setPresumeSignedIn(false);
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
    setPresumeSignedIn(false);
  }, [client]);

  const user = session?.user ?? null;
  const showAuthedUi = Boolean(user) || (loading && presumeSignedIn);

  const value = useMemo<SupabaseAuthContextValue>(
    () => ({
      configured,
      loading,
      session,
      user,
      presumeSignedIn,
      showAuthedUi,
      signOut,
    }),
    [configured, loading, session, user, presumeSignedIn, showAuthedUi, signOut],
  );

  return <SupabaseAuthContext.Provider value={value}>{children}</SupabaseAuthContext.Provider>;
}
