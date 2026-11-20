// The Met Collection API (https://metmuseum.github.io/).
// Search returns only object IDs, so each result is fetched separately.

// Requested through the app's own server (Vite in development, Nginx in production).
const API_BASE = '/met';
// v1/search is retired; v1.1/search supports offset/limit paging.
const SEARCH_URL = `${API_BASE}/public/collection/v1.1/search`;
const OBJECT_URL = `${API_BASE}/public/collection/v1/objects`;

// offset + limit may not exceed 10,000.
const MAX_RESULTS = 10000;

function searchParams(query) {
    const params = new URLSearchParams({ hasImages: 'true' });
    if (query.onView) params.set('isOnView', 'true');

    switch (query.mode) {
        case 'artist':
            params.set('artistOrCulture', 'true');
            params.set('q', query.term);
            break;
        case 'byArtist':
            params.set('artistOrCulture', 'true');
            params.set('q', query.artistName);
            break;
        case 'artwork':
            params.set('title', 'true');
            params.set('q', query.term);
            break;
        // The Met has no style field, so a style is searched across the whole record.
        case 'style':
        case 'keyword':
            params.set('q', query.term);
            break;
        default:
            // Browsing everything with an image is huge; highlights are a better start.
            if (!query.onView) params.set('isHighlight', 'true');
    }
    return params;
}

function normalize(o) {
    const artist = o.artistDisplayName || o.culture || 'Unknown artist';
    return {
        key: `met-${o.objectID}`,
        source: 'met',
        id: o.objectID,
        title: o.title || 'Untitled',
        artist,
        artistDisplay: [o.artistDisplayName, o.artistDisplayBio].filter(Boolean).join('\n') || o.culture,
        artistId: null,
        canSearchArtist: Boolean(o.artistDisplayName),
        date: o.objectDate,
        style: null,
        image: o.primaryImageSmall,
        imageLarge: o.primaryImage || o.primaryImageSmall,
        width: null,
        height: null,
        lqip: null,
        altText: null,
        description: null,
        // Met object records have no on-view flag; a gallery number means it's
        // displayed in a gallery (the docs say it's filled in "where available").
        onView: Boolean(o.GalleryNumber),
        location: o.GalleryNumber ? `Gallery ${o.GalleryNumber}` : null,
        url: o.objectURL,
        details: [
            ['Date', o.objectDate],
            ['Medium', o.medium],
            ['Classification', o.classification],
            ['Department', o.department],
            ['Dimensions', o.dimensions],
        ],
    };
}

async function fetchObject(id, signal) {
    const response = await fetch(`${OBJECT_URL}/${id}`, { signal });
    return response.ok ? response.json() : null;
}

/** Returns { items, total, totalPages } for one page of Met results. */
export async function searchMet(query, { page, limit }, signal) {
    const offset = (page - 1) * limit;
    if (offset + limit > MAX_RESULTS) return { items: [], total: 0, totalPages: 0 };

    const params = searchParams(query);
    params.set('offset', offset);
    params.set('limit', limit);

    const response = await fetch(`${SEARCH_URL}?${params}`, { signal });
    if (!response.ok) {
        console.error('Met API error', response.status, await response.text());
        throw new Error(`Met request failed with status ${response.status}`);
    }
    const { total = 0, objectIDs } = await response.json();

    const objects = await Promise.allSettled((objectIDs ?? []).map((id) => fetchObject(id, signal)));
    signal?.throwIfAborted();

    return {
        // Some objects have no Open Access image even with hasImages=true.
        items: objects
            .map((o) => (o.status === 'fulfilled' ? o.value : null))
            .filter((o) => o?.primaryImageSmall)
            .map(normalize),
        total,
        totalPages: Math.ceil(Math.min(total, MAX_RESULTS) / limit),
    };
}
