import { SOURCE_OPTIONS } from "../api/search.js";

export function SourcePicker({ value, onChange }) {
    return (
        <div className="flex items-center gap-3">
            <span id="source-label" className="text-sm text-muted">Search in</span>
            <div
                role="radiogroup"
                aria-labelledby="source-label"
                className="inline-flex rounded-full border border-line p-0.5"
            >
                {Object.entries(SOURCE_OPTIONS).map(([key, label]) => {
                    const active = value === key;
                    return (
                        <button
                            key={key}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => onChange(key)}
                            className={`rounded-full px-3 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${active
                                ? "bg-mat font-medium text-ink"
                                : "text-muted hover:text-ink"
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
