import { SOURCES } from "../api/search.js";

function Dot({ filled }) {
    return (
        <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${filled ? "bg-accent" : "border border-muted"}`}
        />
    );
}

// Card caption line, e.g. "On view in Gallery 243, Art Institute of Chicago",
// "On view at the Whitney…", or just the museum name when not on view.
export function OnViewLine({ artwork, showSource }) {
    const museum = SOURCES[artwork.source].name;
    if (!artwork.onView) {
        return showSource ? <p className="mt-1 text-xs text-muted">{museum}</p> : null;
    }
    const where = artwork.location ? `On view in ${artwork.location}` : "On view";
    const suffix = showSource ? (artwork.location ? `, ${museum}` : ` at ${museum}`) : "";
    return (
        <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-ink">
            <Dot filled />
            <span>
                {where}
                {suffix && <span className="font-normal text-muted">{suffix}</span>}
            </span>
        </p>
    );
}

// Larger status shown in the detail view.
export function OnViewStatus({ artwork }) {
    const museum = SOURCES[artwork.source].name;
    if (!artwork.onView) {
        return (
            <p className="flex items-center gap-2 text-sm text-muted">
                <Dot />
                Not on view at {museum}
            </p>
        );
    }
    return (
        <p className="inline-flex items-center gap-2 rounded-full bg-mat px-3 py-1.5 text-sm font-medium">
            <Dot filled />
            On view{artwork.location ? ` in ${artwork.location}` : ""}
            <span className="font-normal text-muted">{artwork.location ? `, ${museum}` : ` at ${museum}`}</span>
        </p>
    );
}
