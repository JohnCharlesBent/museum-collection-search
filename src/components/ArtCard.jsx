import { useState } from "react";
import { OnViewLine } from "./OnView";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent";

function ArtImage({ artwork, className = "" }) {
    const { image, width, height, lqip, altText, title, artist } = artwork;
    const [failed, setFailed] = useState(false);
    const sized = width && height;
    return (
        <div
            className={`overflow-hidden bg-mat bg-cover bg-center ${className}`}
            style={{
                // AIC gives image sizes up front; other images size themselves on load.
                aspectRatio: sized ? `${width} / ${height}` : failed ? "4 / 3" : undefined,
                backgroundImage: lqip && !failed ? `url(${lqip})` : undefined,
            }}
        >
            {failed ? (
                <div className="flex h-full items-center justify-center p-4 text-sm text-muted">
                    Image not available
                </div>
            ) : (
                <img
                    src={image}
                    alt={altText || `${title} by ${artist}`}
                    loading="lazy"
                    onError={() => setFailed(true)}
                    className={`block w-full ${sized ? "h-full object-cover" : "h-auto"}`}
                />
            )}
        </div>
    );
}

export function ArtCard({ artwork, showSource, onOpen, onArtist, onStyle }) {
    const { title, artist, date, style, canSearchArtist } = artwork;
    const byline = [artist, date].filter(Boolean).join(", ");

    return (
        <figure className="mb-12 break-inside-avoid">
            <button
                type="button"
                onClick={() => onOpen(artwork)}
                className={`group block w-full text-left ${focusRing}`}
                aria-label={`View details for ${title}`}
            >
                <ArtImage artwork={artwork} className="transition-opacity group-hover:opacity-90" />
            </button>
            <figcaption className="mt-3">
                <p className="font-title text-lg italic leading-snug text-ink">{title}</p>
                <p className="mt-0.5 text-sm text-muted">{byline}</p>
                <OnViewLine artwork={artwork} showSource={showSource} />
                {(canSearchArtist || style) && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        {canSearchArtist && (
                            <button
                                type="button"
                                onClick={() => onArtist(artwork)}
                                className={`text-sm text-ink underline decoration-line decoration-1 underline-offset-4 hover:decoration-ink ${focusRing}`}
                            >
                                More by this artist
                            </button>
                        )}
                        {style && (
                            <button
                                type="button"
                                onClick={() => onStyle(style)}
                                title={`Search for ${style}`}
                                className={`rounded-full border border-line px-2.5 py-0.5 text-xs text-muted transition-colors hover:border-ink hover:text-ink ${focusRing}`}
                            >
                                {style}
                            </button>
                        )}
                    </div>
                )}
            </figcaption>
        </figure>
    );
}
