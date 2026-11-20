import { useEffect, useState } from "react";
import { SiteHeader } from "./SiteHeader";
import { BarList, TimeColumns, GenderSplit } from "./Charts";
import { cachedStats, syncStats } from "../stats/index.js";
import { SOURCES } from "../api/search.js";

const MUSEUMS = Object.keys(SOURCES);
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function initialMuseum() {
    const fromHash = window.location.hash.replace("#", "");
    return MUSEUMS.includes(fromHash) ? fromHash : "aic";
}

function Section({ title, children, note }) {
    return (
        <section className="border-t border-line py-10">
            <h2 className="mb-6 text-xl font-semibold tracking-tight">{title}</h2>
            {children}
            {note && <p className="mt-4 max-w-2xl text-sm text-muted">{note}</p>}
        </section>
    );
}

function Unavailable({ children }) {
    return <p className="max-w-2xl rounded-lg bg-mat px-4 py-3 text-sm">{children}</p>;
}

function Tile({ label, value, detail }) {
    return (
        <div className="border-l border-line pl-5">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-1 font-title text-4xl leading-tight tabular-nums">{value}</p>
            {detail && <p className="mt-1 text-sm text-muted">{detail}</p>}
        </div>
    );
}

function genderSentence(gender) {
    const { woman, man } = gender.artists;
    const worksPct = gender.totalWorks ? Math.round((gender.works.woman / gender.totalWorks) * 100) : 0;
    return `Of the ${gender.total} artists with the most works, ${woman} ${woman === 1 ? "is a woman" : "are women"} and ${man} ${man === 1 ? "is a man" : "are men"}. Women made ${worksPct}% of these artists’ works.`;
}

export function StatsPage() {
    const [museum, setMuseum] = useState(initialMuseum);
    const [stats, setStats] = useState(() => cachedStats(initialMuseum()));
    const [progress, setProgress] = useState("");
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState(null);
    const [syncRequests, setSyncRequests] = useState(0);

    // Show saved stats straight away; resync from the API when there are
    // none, when they're over a day old, or when "Resync now" is pressed.
    useEffect(() => {
        const cached = cachedStats(museum);
        setStats(cached);
        setError(null);
        if (cached && !cached.stale && syncRequests === 0) return;

        const controller = new AbortController();
        setSyncing(true);
        setProgress(cached ? "Resyncing" : "Loading");
        syncStats(museum, { signal: controller.signal, onProgress: setProgress })
            .then(setStats)
            .catch((err) => {
                if (err.name === "AbortError") return;
                console.error("Stats sync failed", err);
                setError(cached
                    ? `Couldn't resync ${SOURCES[museum].name}, so these are the saved stats. Check your connection, then try again.`
                    : `Stats for ${SOURCES[museum].name} couldn't be loaded. Check your connection, then try again.`);
            })
            .finally(() => {
                if (!controller.signal.aborted) setSyncing(false);
            });
        return () => controller.abort();
    }, [museum, syncRequests]);

    const resync = () => setSyncRequests((n) => n + 1);

    const chooseMuseum = (key) => {
        setSyncRequests(0);
        setMuseum(key);
        window.history.replaceState(null, "", `#${key}`);
    };

    const name = SOURCES[museum].name;
    const topArtist = stats?.artists?.[0];

    return (
        <div className="min-h-screen">
            <SiteHeader current="/stats" />
            <main className="mx-auto max-w-7xl px-6 pb-20">
                <section className="pb-8 pt-12">
                    <h1 className="font-title text-4xl leading-tight tracking-tight sm:text-5xl">
                        What’s in each collection
                    </h1>
                    <div className="mt-8 flex flex-wrap items-center gap-3">
                        <span id="museum-label" className="text-sm text-muted">Museum</span>
                        <div role="radiogroup" aria-labelledby="museum-label" className="flex flex-wrap gap-1">
                            {MUSEUMS.map((key) => (
                                <button
                                    key={key}
                                    type="button"
                                    role="radio"
                                    aria-checked={museum === key}
                                    onClick={() => chooseMuseum(key)}
                                    className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${focusRing} ${museum === key ? "bg-ink text-white" : "text-muted hover:bg-mat hover:text-ink"}`}
                                >
                                    {SOURCES[key].name}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {stats && syncing && (
                    <p className="mb-6 rounded-lg bg-mat px-4 py-3 text-sm" aria-live="polite">
                        <span className="motion-safe:animate-pulse">{progress}…</span>{" "}
                        <span className="text-muted">Showing stats saved {new Date(stats.savedAt).toLocaleString()} until it finishes.</span>
                    </p>
                )}

                {error && (
                    <div className="mb-8 rounded-xl border border-line p-6">
                        <p>{error}</p>
                        <button
                            type="button"
                            onClick={resync}
                            className={`mt-4 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white ${focusRing}`}
                        >
                            Try again
                        </button>
                    </div>
                )}

                {!error && !stats && syncing && (
                    <p className="py-16 text-muted" aria-live="polite">
                        <span className="motion-safe:animate-pulse">{progress}…</span>
                    </p>
                )}

                {stats && (
                    <>
                        <div className="grid gap-8 pb-10 sm:grid-cols-3">
                            <Tile label="Works in the collection" value={stats.total.toLocaleString()} />
                            <Tile
                                label="On view now"
                                value={stats.onView.toLocaleString()}
                                detail={`${((stats.onView / stats.total) * 100).toFixed(1)}% of the collection`}
                            />
                            {topArtist ? (
                                <Tile
                                    label="Most-collected artist"
                                    value={topArtist.label}
                                    detail={`${topArtist.value.toLocaleString()} works`}
                                />
                            ) : (
                                <Tile label="Most-collected artist" value="—" detail="Not available from this API" />
                            )}
                        </div>

                        <Section title={stats.eras.unit === "decade" ? "When the works were made, by decade" : "When the works were made, by century"}>
                            <TimeColumns rows={stats.eras.rows} caption={`Works at ${name} by ${stats.eras.unit}`} />
                        </Section>

                        <div className="grid gap-x-16 lg:grid-cols-2">
                            <Section title={stats.types.title}>
                                <BarList rows={stats.types.rows} caption={`${stats.types.title} at ${name}`} />
                            </Section>
                            <Section title="Styles">
                                {stats.styles ? (
                                    <BarList rows={stats.styles} caption={`Styles at ${name}`} />
                                ) : (
                                    <Unavailable>{stats.unavailable?.styles}</Unavailable>
                                )}
                            </Section>
                        </div>

                        <div className="grid gap-x-16 lg:grid-cols-2">
                            <Section title="Most-collected artists">
                                {stats.artists ? (
                                    <BarList rows={stats.artists.slice(0, 15)} caption={`Artists with the most works at ${name}`} />
                                ) : (
                                    <Unavailable>{stats.unavailable?.artists}</Unavailable>
                                )}
                            </Section>
                            <Section
                                title="Women and men among top artists"
                                note={!stats.gender ? null
                                    : stats.genderSource === "museum"
                                        ? "Gender comes from the museum’s own records. “Not recorded” means the museum lists it as unknown."
                                        : "This museum doesn’t record gender, so it comes from Wikidata, matched on each artist’s Wikidata or Getty ULAN ID, or on their exact name when the museum has neither. “Not recorded” means no match was found."}
                            >
                                {stats.gender ? (
                                    <>
                                        <p className="mb-6 max-w-xl">{genderSentence(stats.gender)}</p>
                                        <GenderSplit gender={stats.gender} />
                                    </>
                                ) : (
                                    <Unavailable>
                                        {stats.unavailable?.artists ?? "Gender couldn’t be looked up on Wikidata just now."}
                                    </Unavailable>
                                )}
                            </Section>
                        </div>

                        {stats.collectionGender && (
                            <Section
                                title="Women and men across the whole collection"
                                note="Counts every person in the museum’s records (mostly artists) and the works linked to them. A work by several people counts once for each."
                            >
                                <p className="mb-6 max-w-xl">
                                    {`Women are ${Math.round((stats.collectionGender.artists.woman / stats.collectionGender.total) * 100)}% of the ${stats.collectionGender.total.toLocaleString()} people in the records, and are linked to ${Math.round((stats.collectionGender.works.woman / stats.collectionGender.totalWorks) * 100)}% of the works.`}
                                </p>
                                <GenderSplit
                                    gender={stats.collectionGender}
                                    artistsLabel={`People (${stats.collectionGender.total.toLocaleString()})`}
                                    worksLabel="Works linked to them"
                                />
                            </Section>
                        )}

                        {stats.womenShare && (
                            <Section
                                title="Works by women"
                                note="Counted with the museum’s own tag for works by women artists. The rest includes works by men, by unknown makers and by people the museum hasn’t tagged."
                            >
                                <p className="mb-6 max-w-xl">
                                    {`${stats.womenShare.women.toLocaleString()} of the ${stats.womenShare.total.toLocaleString()} works in the collection (${((stats.womenShare.women / stats.womenShare.total) * 100).toFixed(1)}%) are by women, and ${stats.womenShare.womenOnView.toLocaleString()} of the ${stats.womenShare.onView.toLocaleString()} works on view now (${((stats.womenShare.womenOnView / stats.womenShare.onView) * 100).toFixed(1)}%).`}
                                </p>
                                <GenderSplit
                                    rows={[
                                        {
                                            title: "Whole collection",
                                            data: { woman: stats.womenShare.women, rest: stats.womenShare.total - stats.womenShare.women },
                                            total: stats.womenShare.total,
                                        },
                                        {
                                            title: "On view now",
                                            data: { woman: stats.womenShare.womenOnView, rest: stats.womenShare.onView - stats.womenShare.womenOnView },
                                            total: stats.womenShare.onView,
                                        },
                                    ]}
                                />
                            </Section>
                        )}

                        <Section title="How these numbers are counted">
                            <ul className="max-w-2xl list-disc space-y-1.5 pl-5 text-sm text-muted">
                                {stats.notes.map((n) => <li key={n}>{n}</li>)}
                            </ul>
                            <p className="mt-4 text-sm text-muted">
                                Saved in this browser {new Date(stats.savedAt).toLocaleString()}. Stats resync
                                automatically once they’re a day old.{" "}
                                {!syncing && (
                                    <button
                                        type="button"
                                        onClick={resync}
                                        className={`text-ink underline decoration-line underline-offset-4 hover:decoration-ink ${focusRing}`}
                                    >
                                        Resync now
                                    </button>
                                )}
                            </p>
                        </Section>
                    </>
                )}
            </main>
        </div>
    );
}
