import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { Filter } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DealSort } from "./DealSort";

export type SortColumn = "dealId" | "endBlock";
export type SortDirection = "asc" | "desc";

export interface DealFilterProps {
  accounts: InjectedAccountWithMeta[];
  selectedClients?: string[]; // undefined means “All Deals”
  onChangeClients: (clients?: string[]) => void;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSortColumnChange: (col: SortColumn) => void;
  onSortDirectionChange: (dir: SortDirection) => void;
}

export function DealFilter({
  accounts,
  selectedClients,
  onChangeClients,
  sortColumn,
  sortDirection,
  onSortColumnChange,
  onSortDirectionChange,
}: DealFilterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  // mirror prop → local until “Apply”
  const [localSelection, setLocalSelection] = useState<string[]>(
    selectedClients ?? accounts.map((a) => a.address),
  );

  // keep local in sync if parent ever resets selectedClients
  useEffect(() => {
    setLocalSelection(selectedClients ?? accounts.map((a) => a.address));
  }, [selectedClients, accounts]);

  // close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        cancel();
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // “All clients” is represented by an _empty_ localSelection
  const allLocal = localSelection.length === 0;

  // just wipe out localSelection
  const toggleAll = () => {
    setLocalSelection([]);
  };

  // toggle a single address, menu stays open
  const toggleOne = (addr: string) => {
    setLocalSelection((prev) =>
      prev.includes(addr) ? prev.filter((a) => a !== addr) : [...prev, addr],
    );
  };

  const apply = () => {
    // empty -> no filter (all clients), otherwise filter by localSelection
    onChangeClients(allLocal ? undefined : localSelection);
    setOpen(false);
  };

  const cancel = () => {
    setLocalSelection(selectedClients ?? accounts.map((a) => a.address));
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 px-2 py-1 border rounded hover:bg-gray-50"
      >
        <Filter className="w-4 h-4" />
        <span className="text-sm">Filters</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white border rounded shadow-lg p-4 z-50">
          <label className="flex items-center gap-2 mb-2">
            <input type="checkbox" checked={allLocal} onChange={toggleAll} className="h-4 w-4" />
            <span className="text-sm">All client accounts</span>
          </label>
          <div className="mb-2 text-sm">Injected accounts:</div>
          <div className="space-y-1 max-h-40 overflow-auto mb-2">
            <div className="border rounded">
              {accounts.map((acct) => (
                <label key={acct.address} className="flex items-center gap-2 m-2">
                  <input
                    type="checkbox"
                    checked={!allLocal && localSelection.includes(acct.address)}
                    onChange={() => toggleOne(acct.address)}
                    className="h-4 w-4"
                  />
                  <span className="truncate text-sm">{acct.meta.name ?? acct.address}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-between space-x-2 mb-2">
            <button type="button" onClick={cancel} className="px-3 py-1 text-sm rounded border">
              Cancel
            </button>
            <button
              type="button"
              onClick={apply}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Apply
            </button>
          </div>

          <hr className="my-4" />

          <div>
            <span className="block mb-2 text-sm font-medium">Sort:</span>
            <DealSort
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSortColumnChange={onSortColumnChange}
              onSortDirectionChange={onSortDirectionChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}
