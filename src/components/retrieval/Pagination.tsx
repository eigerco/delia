interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  // Don’t render at all if there’s just one (or zero) pages
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-end items-center mt-3 space-x-2 text-sm">
      {page > 0 && (
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          className="px-2 py-1 border rounded"
        >
          Previous
        </button>
      )}
      <span>
        Page {page + 1} of {totalPages}
      </span>
      {page < totalPages - 1 && (
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          className="px-2 py-1 border rounded"
        >
          Next
        </button>
      )}
    </div>
  );
}
