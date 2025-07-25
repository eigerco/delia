import type { PolkaStorageQueries } from "@polkadot-api/descriptors";
import { useCallback, useEffect, useState } from "react";
import type { PolkaStorageApi } from "../GlobalCtx";
import { DEAL_LIST_PAGE_SIZE } from "./consts";

export type Deal = {
  key: bigint;
  value: PolkaStorageQueries["StorageProvider"]["Proposals"]["Value"];
};

export function sortDeals(
  deals: Deal[],
  sortColumn: "dealId" | "endBlock",
  sortDirection: "asc" | "desc",
): Deal[] {
  return [...deals].sort((a, b) => {
    const aVal: bigint | number = sortColumn === "dealId" ? a.key : a.value.end_block;
    const bVal: bigint | number = sortColumn === "dealId" ? b.key : b.value.end_block;
    const na = typeof aVal === "bigint" ? Number(aVal) : aVal;
    const nb = typeof bVal === "bigint" ? Number(bVal) : bVal;
    return sortDirection === "asc" ? na - nb : nb - na;
  });
}

export function paginateDeals(deals: Deal[], page: number): Deal[] {
  const start = page * DEAL_LIST_PAGE_SIZE;
  return deals.slice(start, start + DEAL_LIST_PAGE_SIZE);
}

export type UseDealsResult = {
  deals: Deal[];
  loading: boolean;
  error: string | null;
  loadDeals: () => void;
};

export function useDeals(api: PolkaStorageApi | null): UseDealsResult {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDeals = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    setError(null);
    try {
      const entries = await api.query.StorageProvider.Proposals.getEntries();
      const allDeals = entries.map((entry) => {
        const key = entry.keyArgs[0];
        const value = entry.value;
        return { key, value };
      });
      setDeals(allDeals);
    } catch (e) {
      console.error(e);
      setError("Failed to load deals.");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  return { deals, loading, error, loadDeals: fetchDeals };
}
