// Art Institute of Chicago artworks search.
// Queries are Elasticsearch queries sent as bracket-style URL parameters.

// In development, go through the Vite proxy (see vite.config.js) so the
// browser makes a same-origin request instead of a cross-site one.
const API_BASE = import.meta.env?.DEV ? '/aic' : 'https://api.artic.edu';
const SEARCH_URL = `${API_BASE}/api/v1/artworks/search`;
const IIIF_BASE = import.meta.env?.DEV ? '/iiif/2' : 'https://www.artic.edu/iiif/2';

// The search API refuses requests past the first 10,000 results.
const MAX_RESULTS = 10000;

const FIELDS = [
    'id',
    'title',
    'artist_display',
    'artist_title',
    'artist_id',
    'date_display',
    'style_title',
    'medium_display',
    'is_on_view',
    'image_id',
    'dimensions',
    'description',
    'gallery_title',
    'thumbnail',
].join(',');

// 843px wide is the size AIC recommends (it is cached on their side). The image
// server refuses (403) sizes larger than the original, so small originals are
// requested at their own width.
export function imageUrl(imageId, originalWidth) {
    const width = originalWidth ? Math.min(843, originalWidth) : 843;
    return `${IIIF_BASE}/${imageId}/full/${width},/0/default.jpg`;
}

function fuzzyMatch(field, text) {
    return { match: { [field]: { query: text, operator: 'and', fuzziness: 'AUTO' } } };
}

// Artist names need exact words: with typo tolerance, "Hopper" also matches "Homer".
function exactMatch(field, text) {
    return { match: { [field]: { query: text, operator: 'and' } } };
}

function matchQuery({ mode, term, artistId, artistName }) {
    switch (mode) {
        case 'artist':
            return [exactMatch('artist_title', term)];
        case 'byArtist':
            // An AIC artist id is exact; a name (from a Met card) is matched instead.
            return artistId ? [] : [exactMatch('artist_title', artistName)];
        case 'artwork':
            return [fuzzyMatch('title', term)];
        case 'style':
            return [{
                multi_match: {
                    query: term, operator: 'and', fuzziness: 'AUTO',
                    fields: ['style_title^2', 'style_titles'],
                },
            }];
        default:
            return [];
    }
}

// Flatten a nested object into bracket-style query params, e.g.
// { query: { bool: { must: [{ match: { title: 'x' } }] } } }
//   -> query[bool][must][0][match][title]=x
function toBracketParams(obj, prefix, out = []) {
    for (const [key, value] of Object.entries(obj)) {
        const name = prefix ? `${prefix}[${key}]` : key;
        if (value !== null && typeof value === 'object') {
            toBracketParams(value, name, out);
        } else {
            out.push(`${encodeURIComponent(name).replace(/%5B/g, '[').replace(/%5D/g, ']')}=${encodeURIComponent(value)}`);
        }
    }
    return out;
}

export function buildSearchUrl(query, { page, limit }) {
    const filter = [{ exists: { field: 'image_id' } }];
    if (query.onView) filter.push({ term: { is_on_view: true } });
    if (query.mode === 'byArtist' && query.artistId) {
        filter.push({ term: { artist_id: query.artistId } });
    }

    const bool = { filter };
    const must = matchQuery(query);
    if (must.length) bool.must = must;

    const params = { fields: FIELDS, limit, page, query: { bool } };
    if (query.mode === 'keyword') params.q = query.term;

    return `${SEARCH_URL}?${toBracketParams(params).join('&')}`;
}

function normalize(a) {
    const image = imageUrl(a.image_id, a.thumbnail?.width);
    return {
        key: `aic-${a.id}`,
        source: 'aic',
        id: a.id,
        title: a.title || 'Untitled',
        artist: a.artist_title || a.artist_display?.split('\n')[0] || 'Unknown artist',
        artistDisplay: a.artist_display,
        artistId: a.artist_id,
        canSearchArtist: Boolean(a.artist_id || a.artist_title),
        date: a.date_display,
        style: a.style_title,
        image,
        imageLarge: image,
        width: a.thumbnail?.width,
        height: a.thumbnail?.height,
        lqip: a.thumbnail?.lqip,
        altText: a.thumbnail?.alt_text,
        description: a.description,
        onView: Boolean(a.is_on_view),
        location: a.gallery_title || null,
        url: `https://www.artic.edu/artworks/${a.id}`,
        details: [
            ['Date', a.date_display],
            ['Style', a.style_title],
            ['Medium', a.medium_display],
            ['Dimensions', a.dimensions],
        ],
    };
}

/** Returns { items, total, totalPages } for one page of AIC results. */
export async function searchAic(query, { page, limit }, signal) {
    const maxPages = Math.floor(MAX_RESULTS / limit);
    if (page > maxPages) return { items: [], total: 0, totalPages: maxPages };

    const response = await fetch(buildSearchUrl(query, { page, limit }), { signal });
    if (!response.ok) {
        console.error('AIC API error', response.status, await response.text());
        throw new Error(`AIC request failed with status ${response.status}`);
    }
    const result = await response.json();
    return {
        items: (result.data ?? []).filter((a) => a.image_id).map(normalize),
        total: result.pagination.total,
        totalPages: Math.min(result.pagination.total_pages, maxPages),
    };
}
