import { SOURCE_OPTIONS } from "../api/search.js";

// Separate pills (rather than one segmented bar) so the options can wrap onto
// a second line on narrow screens instead of running off the edge.
export function SourcePicker({ value, onChange }) {
    return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span id="source-label" className="text-sm text-muted">Search in</span>
            <div role="radiogroup" aria-labelledby="source-label" className="flex flex-wrap gap-1.5">
                {Object.entries(SOURCE_OPTIONS).map(([key, label]) => {
                    const active = value === key;
                    return (
                        <button
                            key={key}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => onChange(key)}
                            className={`rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${active
                                ? "border-ink bg-mat font-medium text-ink"
                                : "border-line text-muted hover:border-ink hover:text-ink"
                                }`}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
