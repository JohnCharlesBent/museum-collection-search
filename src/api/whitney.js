// Whitney Museum of American Art API (https://whitney.org/about/website/api).
// The API allows cross-site requests, so it doesn't need the dev proxy.
// Filters are "contains" matches, so spelling must be exact (e.g. "O'Keeffe").

const API = 'https://whitney.org/api/artworks';

function filters(query) {
    // Results are ordered by the Whitney's popularity score (0–1).
    const q = { s: 'popularity desc' };
    if (query.onView) q.on_view_true = 1;

    switch (query.mode) {
        case 'artist':
            q.display_artist_text_cont = query.term;
            break;
        case 'byArtist':
            q.display_artist_text_cont = query.artistName;
            break;
        case 'artwork':
            q.title_cont = query.term;
            break;
        case 'style':
            // No style field: look for the style in classification, medium or description.
            q.classification_or_medium_or_description_cont = query.term;
            break;
        case 'keyword':
            q.title_or_display_artist_text_or_medium_or_description_cont = query.term;
            break;
        default:
            break;
    }
    return q;
}

export function buildWhitneyUrl(query, { page, limit }) {
    const params = new URLSearchParams({ page, per_page: limit });
    for (const [key, value] of Object.entries(filters(query))) {
        params.set(`q[${key}]`, value);
    }
    return `${API}?${params}`;
}

function normalize({ id, attributes: a }) {
    const image = a.images?.[0]?.url;
    return {
        key: `whitney-${id}`,
        source: 'whitney',
        id,
        title: a.title || 'Untitled',
        artist: a.display_artist_text || 'Unknown artist',
        artistDisplay: a.display_artist_text,
        artistId: null,
        canSearchArtist: Boolean(a.display_artist_text),
        date: a.display_date,
        style: null,
        image,
        imageLarge: image,
        width: null,
        height: null,
        lqip: null,
        altText: a.alt_text || a.ai_alt_text,
        description: a.description,
        url: `https://whitney.org/collection/works/${id}`,
        // The Whitney says whether a work is on view, but not in which gallery.
        onView: Boolean(a.on_view),
        location: null,
        details: [
            ['Date', a.display_date],
            ['Classification', a.classification],
            ['Medium', a.medium],
            ['Dimensions', a.dimensions],
            ['Credit line', a.credit_line],
        ],
    };
}

/** Returns { items, total, totalPages } for one page of Whitney results. */
export async function searchWhitney(query, { page, limit }, signal) {
    const response = await fetch(buildWhitneyUrl(query, { page, limit }), { signal });
    if (!response.ok) {
        console.error('Whitney API error', response.status, await response.text());
        throw new Error(`Whitney request failed with status ${response.status}`);
    }
    const result = await response.json();
    const total = result.meta?.total ?? 0;
    return {
        items: (result.data ?? []).filter((item) => item.attributes.images?.length).map(normalize),
        total,
        totalPages: Math.ceil(total / limit),
    };
}
