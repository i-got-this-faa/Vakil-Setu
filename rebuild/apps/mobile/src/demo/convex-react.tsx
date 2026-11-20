// DEMO MODE ONLY: stands in for "convex/react" (aliased in metro.config.js when EXPO_PUBLIC_DEMO_MODE=1).
import { useCallback, useSyncExternalStore, type ReactNode } from "react";
import { getVersion, runAction, runMutation, runQuery, subscribe } from "./store";

export class ConvexReactClient {
  constructor(_url?: string) {}
}

export function ConvexProvider({ children }: { client?: unknown; children: ReactNode }) {
  return <>{children}</>;
}

export function useQuery(ref: unknown, args?: Record<string, unknown> | "skip"): any {
  useSyncExternalStore(subscribe, getVersion, getVersion);
  if (args === "skip") return undefined;
  return runQuery(ref, args);
}

export function usePaginatedQuery(): any {
  return { results: [], status: "Exhausted", isLoading: false, loadMore: () => undefined };
}

export function useMutation(ref: unknown): any {
  return useCallback((args: Record<string, unknown>) => runMutation(ref, args ?? {}), [ref]);
}

export function useAction(ref: unknown): any {
  return useCallback((args: Record<string, unknown>) => runAction(ref, args ?? {}), [ref]);
}

export function useConvexAuth() {
  return { isLoading: false, isAuthenticated: true };
}
