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
import type { Session, User } from "@supabase/supabase-js";

import { capturePostHog } from "@/lib/posthogClient";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { getBrowserSupabase } from "@/lib/supabase/browserClient";

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

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const configured = useMemo(() => Boolean(getSupabasePublicConfig()), []);
  const client = useMemo(() => getBrowserSupabase(), [configured]);

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!client) {
      setLoading(false);
      return;
    }

    let unsub: { subscription: { unsubscribe: () => void } } | undefined;

    void client.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
      if (s?.user) {
        posthogIdentify(s.user);
      }
    });

    const { data } = client.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
      if (_event === "SIGNED_IN" && s?.user) {
        posthogIdentify(s.user);
        capturePostHog("sign_in");
      }
      if (_event === "SIGNED_OUT") {
        posthogReset();
      }
    });
    unsub = data;

    return () => unsub?.subscription.unsubscribe();
  }, [client]);

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
