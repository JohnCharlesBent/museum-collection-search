import { SEARCH_MODES } from "../api/search.js";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function Searchbar({ mode, onModeChange, searchTerm, onSearchTermChange, onSearch }) {
    const handleSubmit = (e) => {
        e.preventDefault();
        onSearch();
    };

    return (
        <form role="search" onSubmit={handleSubmit}>
            <div className="mb-3 flex flex-wrap gap-1" role="radiogroup" aria-label="Search by">
                {Object.entries(SEARCH_MODES).map(([key, { label }]) => {
                    const active = mode === key;
                    return (
                        <button
                            key={key}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => onModeChange(key)}
                            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${focusRing} ${active
                                ? "bg-ink text-white"
                                : "text-muted hover:bg-mat hover:text-ink"
                                }`}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-line bg-white py-1.5 pl-4 pr-1.5 transition-colors focus-within:border-ink">
                <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <circle cx="8.5" cy="8.5" r="5.5" />
                    <path d="m13 13 4 4" strokeLinecap="round" />
                </svg>
                <label htmlFor="search" className="sr-only">
                    Search by {SEARCH_MODES[mode].label.toLowerCase()}
                </label>
                <input
                    id="search"
                    type="search"
                    autoComplete="off"
                    placeholder={SEARCH_MODES[mode].placeholder}
                    value={searchTerm}
                    onChange={(e) => onSearchTermChange(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent py-2 text-base text-ink placeholder:text-muted/70 focus:outline-none"
                />
                <button
                    type="submit"
                    disabled={!searchTerm.trim()}
                    className={`rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
                >
                    Search
                </button>
            </div>
        </form>
    );
}
