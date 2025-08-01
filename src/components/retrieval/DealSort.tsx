import { ArrowDown, ArrowUp, type LucideIcon } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";

type SortColumn = "dealId" | "endBlock";
type SortDirection = "asc" | "desc";

const COLUMNS: { key: SortColumn; label: string }[] = [
  { key: "dealId", label: "Deal ID" },
  { key: "endBlock", label: "Deal End" },
];

const DIRECTIONS: { key: SortDirection; icon: LucideIcon }[] = [
  { key: "asc", icon: ArrowUp },
  { key: "desc", icon: ArrowDown },
];

interface DealSortProps {
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSortColumnChange: (col: SortColumn) => void;
  onSortDirectionChange: (dir: SortDirection) => void;
}

export function DealSort({
  sortColumn,
  sortDirection,
  onSortColumnChange,
  onSortDirectionChange,
}: DealSortProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [open]);

  const handleSelect = (col: SortColumn, dir: SortDirection) => {
    onSortColumnChange(col);
    onSortDirectionChange(dir);
    setOpen(false);
  };

  const labelText = sortColumn === "dealId" ? "Deal ID" : "Deal End";
  const directionIcon =
    sortDirection === "asc" ? (
      <ArrowUp className="inline w-4 h-4" />
    ) : (
      <ArrowDown className="inline w-4 h-4" />
    );

  return (
    <div ref={containerRef} className="overflow-visible relative inline-block ml-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="px-2 py-1 text-sm border rounded hover:bg-gray-50 flex items-center gap-1"
      >
        <span>{labelText}</span>
        {directionIcon}
      </button>

      {open && (
        <ul className="absolute mt-1 w-40 bg-white border rounded z-50 text-sm right-0" role="menu">
          {COLUMNS.map((col, idx) => (
            <Fragment key={col.key}>
              {DIRECTIONS.map((dir) => (
                <SortOption
                  key={`${col.key}-${dir.key}`}
                  column={col.key}
                  direction={dir.key}
                  active={sortColumn === col.key && sortDirection === dir.key}
                  onSelect={handleSelect}
                  ColumnIcon={dir.icon}
                  columnLabel={col.label}
                />
              ))}
              {idx < COLUMNS.length - 1 && (
                <li>
                  <hr className="my-1 border-gray-200" />
                </li>
              )}
            </Fragment>
          ))}
        </ul>
      )}
    </div>
  );
}

interface SortOptionProps {
  column: SortColumn;
  direction: SortDirection;
  active: boolean;
  onSelect: (col: SortColumn, dir: SortDirection) => void;
  ColumnIcon: LucideIcon;
  columnLabel: string;
}

function SortOption({
  column,
  direction,
  active,
  onSelect,
  ColumnIcon,
  columnLabel,
}: SortOptionProps) {
  return (
    <li>
      <button
        type="button"
        role="menuitem"
        onClick={() => onSelect(column, direction)}
        className={`flex justify-between w-full px-3 py-1 hover:bg-gray-100 ${
          active ? "bg-gray-200 font-medium" : ""
        }`}
      >
        {columnLabel} <ColumnIcon className="w-4 h-4" />
      </button>
    </li>
  );
}
