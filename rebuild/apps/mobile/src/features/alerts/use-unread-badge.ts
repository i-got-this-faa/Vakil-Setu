import { usePaginatedQuery } from "convex/react";
import { api } from "@legal-setu/backend/api";
import { useAccountGateState } from "../../hooks/use-account-gate";

/**
 * Unread count for the tab badge. Convex exposes no count query, so the badge counts
 * unread items among the first page and shows "N+" when more pages exist.
 */
export function useUnreadBadge(): { label: string | undefined; count: number } {
  const gate = useAccountGateState();
  const enabled = gate.kind === "ready";
  const { results, status } = usePaginatedQuery(api.notifications.mine, enabled ? {} : "skip", { initialNumItems: 50 });
  const count = results.filter((item) => !item.readAt).length;
  if (count === 0) return { label: undefined, count };
  return { label: status === "CanLoadMore" ? `${count}+` : String(count), count };
}
