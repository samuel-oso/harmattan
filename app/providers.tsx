"use client";

import { useEffect, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { restoreView } from "@/lib/store";

let browserClient: QueryClient | undefined;

function getClient() {
  if (typeof window === "undefined") return new QueryClient();
  browserClient ??= new QueryClient();
  return browserClient;
}

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    void restoreView();
  }, []);
  return <QueryClientProvider client={getClient()}>{children}</QueryClientProvider>;
}
