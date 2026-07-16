import { cn } from '@/utils';

function getPageNumbers(page: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, 2, 3, totalPages]);
  if (page > 1 && page < totalPages) pages.add(page);

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result: (number | 'ellipsis')[] = [];

  sorted.forEach((pageNumber, i) => {
    if (i > 0 && pageNumber - sorted[i - 1] > 1) {
      result.push('ellipsis');
    }
    result.push(pageNumber);
  });

  return result;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-6">
      <div className="flex items-center gap-2 text-sm">
        {getPageNumbers(page, totalPages).map((entry, i) =>
          entry === 'ellipsis' ? (
            <span key={`ellipsis-${i}`} className="px-1 text-[#678]">
              …
            </span>
          ) : (
            <button
              key={entry}
              type="button"
              onClick={() => onPageChange(entry)}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md',
                entry === page
                  ? 'bg-accent text-black'
                  : 'text-[#9ab0bf] hover:bg-white/5'
              )}
            >
              {entry}
            </button>
          )
        )}
      </div>

      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(Math.min(page + 1, totalPages))}
        className="rounded-md bg-white/5 px-4 py-2 text-sm text-[#c2d0dd] hover:bg-white/10 disabled:cursor-default disabled:opacity-40"
      >
        Older
      </button>
    </div>
  );
}
