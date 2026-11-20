import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { SOURCES } from "../api/search.js";
import { OnViewStatus } from "./OnView";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const SITE_NAMES = { aic: "artic.edu", met: "metmuseum.org", whitney: "whitney.org", getty: "getty.edu", cleveland: "clevelandart.org", harvard: "harvardartmuseums.org" };

// Shows the card-sized image straight away (it's already loaded), then swaps
// in the full-size image once it has downloaded (Met originals can be 4000px).
// Rendered with key={artwork.key}, so its state resets for each artwork.
function DialogImage({ artwork }) {
    const { image, imageLarge, altText, title, artist } = artwork;
    const [largeReady, setLargeReady] = useState(imageLarge === image);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!imageLarge || imageLarge === image) return;
        const preload = new Image();
        preload.onload = () => setLargeReady(true);
        preload.src = imageLarge;
        return () => {
            preload.onload = null;
        };
    }, [image, imageLarge]);

    if (failed) {
        return <p className="py-24 text-sm text-muted">Image not available</p>;
    }
    return (
        <img
            src={largeReady ? imageLarge : image}
            alt={altText || `${title} by ${artist}`}
            onError={() => setFailed(true)}
            className="max-h-[40vh] w-auto max-w-full object-contain shadow-sm md:max-h-[calc(92vh-5rem)]"
        />
    );
}

export function ArtworkDialog({ artwork, onClose, onArtist, onStyle }) {
    const ref = useRef(null);

    useEffect(() => {
        const dialog = ref.current;
        if (artwork && dialog && !dialog.open) dialog.showModal();
        if (!artwork && dialog?.open) dialog.close();
    }, [artwork]);

    // Close when the backdrop (the dialog element itself) is clicked.
    const handleClick = (e) => {
        if (e.target === ref.current) ref.current.close();
    };

    const details = artwork
        ? [["Collection", SOURCES[artwork.source].name], ...artwork.details].filter(([, value]) => value)
        : [];
    const siteName = artwork && SITE_NAMES[artwork.source];

    return (
        <dialog
            ref={ref}
            onClose={onClose}
            onClick={handleClick}
            className="m-auto max-h-[92vh] w-[min(1100px,94vw)] overflow-hidden rounded-2xl bg-white p-0 text-ink shadow-2xl"
        >
            {artwork && (
                <button
                    type="button"
                    onClick={() => ref.current.close()}
                    aria-label="Close"
                    className={`absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-muted shadow-sm hover:bg-mat hover:text-ink ${focusRing}`}
                >
                    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
                    </svg>
                </button>
            )}
            {artwork && (
                // Capped at the window height: the image keeps its place and the
                // text column scrolls when it's longer than the window.
                <div className="flex max-h-[92vh] flex-col md:flex-row">
                    <div className="flex shrink-0 items-center justify-center bg-mat p-6 md:w-3/5 md:p-10">
                        <DialogImage key={artwork.key} artwork={artwork} />
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 md:p-8">
                        <h2 className="pr-10 font-title text-3xl italic leading-tight">{artwork.title}</h2>
                        <p className="mt-2 whitespace-pre-line text-muted">{artwork.artistDisplay || artwork.artist}</p>
                        <div className="mt-4">
                            <OnViewStatus artwork={artwork} />
                        </div>

                        <dl className="mt-6 grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-4 gap-y-2 border-t border-line pt-5 text-sm">
                            {details.map(([label, value]) => (
                                <div key={label} className="contents">
                                    <dt className="text-muted">{label}</dt>
                                    <dd className="whitespace-pre-line">{value}</dd>
                                </div>
                            ))}
                        </dl>

                        {artwork.description && (
                            <div
                                className="prose-description mt-6 border-t border-line pt-5 text-[15px] leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(artwork.description) }}
                            />
                        )}

                        <div className="mt-8 flex flex-wrap gap-2">
                            {artwork.canSearchArtist && (
                                <button
                                    type="button"
                                    onClick={() => onArtist(artwork)}
                                    className={`rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white ${focusRing}`}
                                >
                                    More by {artwork.artist}
                                </button>
                            )}
                            {artwork.style && (
                                <button
                                    type="button"
                                    onClick={() => onStyle(artwork.style)}
                                    className={`rounded-lg border border-line px-4 py-2.5 text-sm font-medium hover:border-ink ${focusRing}`}
                                >
                                    More {artwork.style}
                                </button>
                            )}
                            {artwork.url && (
                                <a
                                    href={artwork.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`rounded-lg px-2 py-2.5 text-sm font-medium text-muted underline decoration-line underline-offset-4 hover:text-ink ${focusRing}`}
                                >
                                    View on {siteName}
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </dialog>
    );
}
