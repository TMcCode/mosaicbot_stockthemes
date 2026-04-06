"use client";

import { createContext, useContext, type ReactNode } from "react";

const BeehiivApiConfiguredContext = createContext(false);

export function NewsletterRuntimeProvider({
  children,
  beehiivApiConfigured,
}: {
  children: ReactNode;
  beehiivApiConfigured: boolean;
}) {
  return (
    <BeehiivApiConfiguredContext.Provider value={beehiivApiConfigured}>
      {children}
    </BeehiivApiConfiguredContext.Provider>
  );
}

export function useBeehiivApiConfigured(): boolean {
  return useContext(BeehiivApiConfiguredContext);
}
