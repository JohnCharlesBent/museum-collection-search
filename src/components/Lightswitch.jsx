export function Lightswitch({ checked, onChange }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className="inline-flex items-center gap-2.5 rounded-full py-1 text-sm text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
            <span
                aria-hidden="true"
                className={`relative h-5 w-9 rounded-full transition-colors ${checked ? "bg-ink" : "bg-muted/40"}`}
            >
                <span
                    className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-paper shadow-sm transition-transform motion-reduce:transition-none ${checked ? "translate-x-4" : ""}`}
                />
            </span>
            Only works on view now
        </button>
    );
}
