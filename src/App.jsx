import { useState, useEffect } from "react";
import { Lightswitch } from "./components/Lightswitch";
import { SiteHeader } from "./components/SiteHeader";
import { ArtGrid, ArtGridSkeleton } from "./components/ArtGrid";
import { ArtworkDialog } from "./components/ArtworkDialog";
import { Pagination } from "./components/Pagination";
import { SourcePicker } from "./components/SourcePicker";
import { Searchbar } from "./components/Searchbar.jsx";
import { searchCollections, describeQuery, sourcesFor, SOURCES } from "./api/search.js";

function App() {
  const [showOnView, setShowOnView] = useState(true);
  const [source, setSource] = useState("all");
  const [searchMode, setSearchMode] = useState("artist");
  const [searchTerm, setSearchTerm] = useState("");
  // The query currently displayed; changing it triggers a fetch.
  const [query, setQuery] = useState({ source: "all", mode: "browse", onView: true, page: 1 });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    searchCollections(query, controller.signal)
      .then(setResults)
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error("Error fetching data", err);
        setError("The collection couldn't be loaded. Check your connection, then try again.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query, retryCount]);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const runQuery = (next) => {
    setSelected(null);
    setQuery({ source, onView: showOnView, page: 1, ...next });
    scrollToTop();
  };

  const handleSearch = () => {
    const term = searchTerm.trim();
    if (term) runQuery({ mode: searchMode, term });
  };

  const handleOnViewChange = (checked) => {
    setShowOnView(checked);
    setQuery((q) => ({ ...q, onView: checked, page: 1 }));
  };

  const handleSourceChange = (next) => {
    setSource(next);
    setSelected(null);
    setQuery((q) => ({ ...q, source: next, page: 1 }));
  };

  const handlePageChange = (delta) => {
    setQuery((q) => ({ ...q, page: q.page + delta }));
    scrollToTop();
  };

  // AIC artworks carry an exact artist id; Met artworks are matched by name.
  const handleArtist = (artwork) => {
    runQuery({
      mode: "byArtist",
      artistName: artwork.artist,
      artistId: artwork.source === "aic" ? artwork.artistId : null,
      harvardPersonId: artwork.source === "harvard" ? artwork.artistId : null,
      gettyPersonId: artwork.source === "getty" ? artwork.artistId : null,
    });
  };

  const handleStyle = (style) => {
    setSearchMode("style");
    setSearchTerm(style);
    runQuery({ mode: "style", term: style });
  };

  const handleReset = () => {
    setSearchTerm("");
    runQuery({ mode: "browse" });
  };

  const hasResults = results && results.items.length > 0;
  const searchedSources = sourcesFor(query.source);
  const countText = results
    ? `${results.total.toLocaleString()} ${results.total === 1 ? "work" : "works"}` +
      (searchedSources.length > 1
        ? ` (${searchedSources
          .filter((s) => s in results.totals)
          .map((s) => `${SOURCES[s].short} ${results.totals[s].toLocaleString()}`)
          .join(", ")})`
        : "")
    : "";
  // Only the Art Institute and Harvard tag works by style; elsewhere a style search is approximate.
  const untagged = searchedSources.filter((s) => s !== "aic" && s !== "harvard").map((s) => SOURCES[s].short);
  const styleNote = query.mode === "style" && untagged.length
    ? `${untagged.join(" and ")} ${untagged.length > 1 ? "don't" : "doesn't"} tag works by style, so ${untagged.length > 1 ? "their" : "its"} results are works that mention this style in their record.`
    : null;

  return (
    <div className="min-h-screen">
      <SiteHeader
        current="/"
        onHome={(e) => {
          e.preventDefault();
          handleReset();
        }}
      />

      <main className="mx-auto max-w-7xl px-6">
        <section className="max-w-3xl pb-10 pt-12">
          <h1 className="font-title text-4xl leading-tight tracking-tight sm:text-5xl">
            Find an artist, a work, or a style
          </h1>
          <div className="mt-8">
            <Searchbar
              mode={searchMode}
              onModeChange={setSearchMode}
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
              onSearch={handleSearch}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-3">
            <SourcePicker value={source} onChange={handleSourceChange} />
            <Lightswitch checked={showOnView} onChange={handleOnViewChange} />
          </div>
        </section>

        <section aria-labelledby="results-title" className="pb-20">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
            <div>
              <h2 id="results-title" className="text-xl font-semibold tracking-tight">
                {describeQuery(query)}
              </h2>
              <p className="mt-1 text-sm text-muted" aria-live="polite">
                {loading
                  ? "Loading…"
                  : countText}
                {query.mode !== "browse" && !loading && (
                  <>
                    {" "}
                    <button
                      type="button"
                      onClick={handleReset}
                      className="ml-2 text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
                    >
                      Clear search
                    </button>
                  </>
                )}
              </p>
            </div>
            {hasResults && (
              <Pagination
                onPageChange={handlePageChange}
                currentPage={query.page}
                totalPages={results.totalPages}
                disabled={loading}
              />
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-line p-6">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => setRetryCount((n) => n + 1)}
                className="mt-4 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white"
              >
                Try again
              </button>
            </div>
          )}

          {!error && results?.failed.length > 0 && (
            <p className="mb-8 rounded-lg bg-mat px-4 py-3 text-sm">
              {results.failed.map((s) => SOURCES[s].name).join(" and ")} couldn't be searched just now, so
              these results come from {searchedSources.filter((s) => !results.failed.includes(s)).map((s) => SOURCES[s].name).join(" and ")} only.
            </p>
          )}
          {!error && styleNote && <p className="mb-8 text-sm text-muted">{styleNote}</p>}

          {!error && !results && loading && <ArtGridSkeleton />}

          {!error && results && !hasResults && !loading && (
            <div className="py-16 text-center">
              <p className="font-title text-2xl italic">No works found</p>
              <p className="mt-2 text-muted">
                Check the spelling, try another search type, or turn off “Only works on view now”.
              </p>
            </div>
          )}

          {!error && hasResults && (
            <div className={`transition-opacity ${loading ? "opacity-40" : ""}`}>
              <ArtGrid
                artworks={results.items}
                showSource={searchedSources.length > 1}
                onOpen={setSelected}
                onArtist={handleArtist}
                onStyle={handleStyle}
              />
              <div className="mt-4 flex justify-center border-t border-line pt-8">
                <Pagination
                  onPageChange={handlePageChange}
                  currentPage={query.page}
                  totalPages={results.totalPages}
                  disabled={loading}
                />
              </div>
            </div>
          )}
        </section>
      </main>

      <ArtworkDialog
        artwork={selected}
        onClose={() => setSelected(null)}
        onArtist={handleArtist}
        onStyle={handleStyle}
      />
    </div>
  );
}

export default App;
