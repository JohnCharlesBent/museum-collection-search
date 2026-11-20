import { ArtCard } from "./ArtCard";

export function ArtGrid({ artworks, showSource, onOpen, onArtist, onStyle }) {
    return (
        <div className="columns-1 gap-8 sm:columns-2 lg:columns-3 xl:columns-4">
            {artworks.map((a) => (
                <ArtCard
                    key={a.key}
                    artwork={a}
                    showSource={showSource}
                    onOpen={onOpen}
                    onArtist={onArtist}
                    onStyle={onStyle}
                />
            ))}
        </div>
    );
}

const skeletonHeights = ["aspect-[4/5]", "aspect-[3/4]", "aspect-square", "aspect-[4/3]"];

export function ArtGridSkeleton() {
    return (
        <div className="columns-1 gap-8 sm:columns-2 lg:columns-3 xl:columns-4" aria-hidden="true">
            {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="mb-12 break-inside-avoid">
                    <div className={`${skeletonHeights[i % 4]} bg-mat motion-safe:animate-pulse`} />
                    <div className="mt-3 h-4 w-3/4 rounded bg-mat" />
                    <div className="mt-2 h-3 w-1/2 rounded bg-mat" />
                </div>
            ))}
        </div>
    );
}
