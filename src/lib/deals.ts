import type { PolkaStorageApis } from "@polkadot-api/descriptors";
import { useCallback, useEffect, useState } from "react";
import type { PolkaStorageApi } from "../GlobalCtx";
import { DEAL_LIST_PAGE_SIZE } from "./consts";

type Proposals = PolkaStorageApis["StorageProviderApi"]["get_proposals"]["Value"];
type ProposalEntry = Proposals[number];
type Proposal = ProposalEntry[1];

export type Deal = {
  key: bigint;
  value: Proposal;
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

export function useDeals({
  api,
  clients,
  providers,
}: { api: PolkaStorageApi | null; clients?: string[]; providers?: string[] }): UseDealsResult {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDeals = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    setError(null);
    try {
      const entries = await api.apis.StorageProviderApi.get_proposals(clients, providers);
      const deals = entries.map((entry) => {
        const key = entry[0]; // DealID
        const value = entry[1]; // Deal
        return { key, value };
      });
      setDeals(deals);
    } catch (e) {
      console.error(e);
      setError("Failed to load deals.");
    } finally {
      setLoading(false);
    }
  }, [api, clients, providers]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  return { deals, loading, error, loadDeals: fetchDeals };
}
