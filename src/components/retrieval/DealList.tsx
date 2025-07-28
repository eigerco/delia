import { Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCtx } from "../../GlobalCtx";
import { DEAL_LIST_PAGE_SIZE } from "../../lib/consts";
import { type Deal, paginateDeals, sortDeals, useDeals } from "../../lib/deals";
import { downloadDeal } from "../../lib/download";
import { DealRow } from "./DealRow";
import { DealSort } from "./DealSort";
import { Pagination } from "./Pagination";

export function DealList() {
  const { papiTypedApi, latestFinalizedBlock } = useCtx();
  const { deals, loading, error, loadDeals } = useDeals(papiTypedApi);
  const [page, setPage] = useState(0);
  const [sortColumn, setSortColumn] = useState<"dealId" | "endBlock">("dealId");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(deals.length / DEAL_LIST_PAGE_SIZE) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [deals.length, page]);

  // Memoize the sorted list so we only re‑sort when
  // - the raw deals data changes
  // - the chosen sort column changes
  // - or the sort direction changes
  // Without this, clicking “Next Page” or other state updates would re‑sort every render.
  const sortedDeals = useMemo(
    () => sortDeals(deals, sortColumn, sortDirection),
    [deals, sortColumn, sortDirection],
  );

  // Memoize the page slice so we only re‑slice when
  // - the sorted data changes
  // - or the current page index changes
  // This prevents recalculating the slice on every render.
  const paginated = useMemo(() => paginateDeals(sortedDeals, page), [sortedDeals, page]);

  // download handler
  const handleDownload = useCallback(
    async (deal: Deal) => {
      try {
        await downloadDeal(papiTypedApi, deal);
      } catch (err) {
        console.error("Download failed:", err);
      }
    },
    [papiTypedApi],
  );

  if (loading)
    return (
      <div className="text-center py-8">
        <Loader2 className="animate-spin mx-auto h-8 w-8 text-blue-500 mb-4" />
        <p className="text-gray-600">Loading on-chain data...</p>
      </div>
    );
  if (error)
    return (
      <div className="text-center py-8 text-red-500">
        <p>{error}</p>
        <button type="button" onClick={loadDeals} className="mt-2 underline">
          Retry
        </button>
      </div>
    );
  if (!latestFinalizedBlock) return;

  return (
    <div className="p-4">
      <div className="flex mb-1 items-center">
        <p className="font-medium text-xl">Deals</p>
        <button type="button" onClick={loadDeals} className="hover:text-blue-400 ml-5">
          <RefreshCw width={16} />
        </button>
        <div className="ml-auto">
          <DealSort
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSortColumnChange={setSortColumn}
            onSortDirectionChange={setSortDirection}
          />
        </div>
      </div>

      {deals.length === 0 ? (
        <p className="text-center">No active deals.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-xs uppercase">
                <th className="px-3 py-2">Deal ID</th>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">Client</th>
                <th className="px-3 py-2">Deal End</th>
                <th className="px-3 py-2">Download</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((deal) => (
                <DealRow
                  key={deal.key.toString()}
                  deal={deal}
                  latestFinalizedBlock={latestFinalizedBlock}
                  onDownload={() => handleDownload(deal)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={page}
        totalPages={Math.ceil(sortedDeals.length / DEAL_LIST_PAGE_SIZE)}
        onPageChange={setPage}
      />
    </div>
  );
}
