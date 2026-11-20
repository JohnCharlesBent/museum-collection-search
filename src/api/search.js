// Searches one or more museums and merges the results into one page.
import { searchAic } from './aic.js';
import { searchMet } from './met.js';
import { searchWhitney } from './whitney.js';
import { searchHarvard, HARVARD_ENABLED } from './harvard.js';
import { searchGetty } from './getty.js';
import { searchCleveland } from './cleveland.js';

export const PAGE_SIZE = 12;

export const SOURCES = {
    aic: { name: 'Art Institute of Chicago', short: 'Art Institute' },
    met: { name: 'The Met', short: 'The Met' },
    whitney: { name: 'Whitney Museum of American Art', short: 'Whitney' },
    getty: { name: 'J. Paul Getty Museum', short: 'Getty' },
    cleveland: { name: 'Cleveland Museum of Art', short: 'Cleveland' },
    // Only shown when a Harvard API key is set (see harvard.js).
    ...(HARVARD_ENABLED ? { harvard: { name: 'Harvard Art Museums', short: 'Harvard' } } : {}),
};

// Options offered in the "Search in" picker.
export const SOURCE_OPTIONS = {
    all: 'All',
    aic: 'Art Institute',
    met: 'The Met',
    whitney: 'Whitney',
    getty: 'Getty',
    cleveland: 'Cleveland',
    ...(HARVARD_ENABLED ? { harvard: 'Harvard' } : {}),
};

export const SEARCH_MODES = {
    artist: { label: 'Artist', placeholder: 'Artist, like Monet or Hokusai' },
    artwork: { label: 'Artwork', placeholder: 'Artwork title, like Nighthawks' },
    style: { label: 'Style', placeholder: 'Style, like Impressionism or Surrealism' },
    keyword: { label: 'Keyword', placeholder: 'Anything: subjects, places, materials' },
};

const searchers = { aic: searchAic, met: searchMet, whitney: searchWhitney, getty: searchGetty, cleveland: searchCleveland, harvard: searchHarvard };

export function sourcesFor(source) {
    return source === 'all' ? Object.keys(SOURCES) : [source];
}

/**
 * query: { source: 'all'|'aic'|'met'|'whitney'|'getty'|'cleveland'|'harvard',
 *          mode: 'browse'|'artist'|'artwork'|'style'|'keyword'|'byArtist',
 *          term?, artistName?, artistId?, onView, page }
 * Returns { items, total, totalPages, totals: { aic?, met? }, failed: [source] }.
 */
export async function searchCollections(query, signal) {
    const sources = sourcesFor(query.source);
    // Split each page evenly between the museums being searched.
    const limit = Math.floor(PAGE_SIZE / sources.length);

    const settled = await Promise.allSettled(
        sources.map((s) => searchers[s](query, { page: query.page, limit }, signal)),
    );
    signal?.throwIfAborted();

    const lists = [];
    const totals = {};
    const failed = [];
    let totalPages = 0;
    settled.forEach((result, i) => {
        const source = sources[i];
        if (result.status === 'fulfilled') {
            lists.push(result.value.items);
            totals[source] = result.value.total;
            totalPages = Math.max(totalPages, result.value.totalPages);
        } else {
            console.error(`${SOURCES[source].name} search failed`, result.reason);
            failed.push(source);
        }
    });
    if (failed.length === sources.length) {
        throw new Error('Every museum search failed');
    }

    // Alternate between museums so each appears throughout the page.
    const items = [];
    const longest = Math.max(...lists.map((l) => l.length));
    for (let i = 0; i < longest; i++) {
        for (const list of lists) if (list[i]) items.push(list[i]);
    }

    const total = Object.values(totals).reduce((a, b) => a + b, 0);
    return { items, total, totalPages, totals, failed };
}

export function describeQuery({ mode, term, artistName, onView }) {
    switch (mode) {
        case 'artist':
            return `Works by artists matching "${term}"`;
        case 'artwork':
            return `Artworks titled "${term}"`;
        case 'style':
            return `Works in the style of "${term}"`;
        case 'keyword':
            return `Results for "${term}"`;
        case 'byArtist':
            return `Works by ${artistName}`;
        default:
            return onView ? 'Currently on view' : 'Browse the collections';
    }
}
