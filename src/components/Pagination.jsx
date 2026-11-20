const buttonClass =
    "inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function Chevron({ flip }) {
    return (
        <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-4 w-4 ${flip ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="m12 5-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

export function Pagination({ onPageChange, currentPage, totalPages, disabled }) {
    return (
        <nav aria-label="Pages" className="flex items-center gap-3">
            <button
                type="button"
                aria-label="Previous page"
                className={buttonClass}
                disabled={disabled || currentPage <= 1}
                onClick={() => onPageChange(-1)}
            >
                <Chevron />
            </button>
            <span className="text-sm tabular-nums text-muted">
                Page {currentPage.toLocaleString()} of {totalPages.toLocaleString()}
            </span>
            <button
                type="button"
                aria-label="Next page"
                className={buttonClass}
                disabled={disabled || currentPage >= totalPages}
                onClick={() => onPageChange(1)}
            >
                <Chevron flip />
            </button>
        </nav>
    );
}
