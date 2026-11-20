// Cleveland Museum of Art Open Access API (https://openaccess-api.clevelandart.org/).
// No key needed, and it allows requests straight from a web page.
// Always ask for specific `fields`: a bad field name, or none at all, can make
// the server reply with an error the browser can't read ("Failed to fetch").

export const CLEVELAND_API = 'https://openaccess-api.clevelandart.org/api';

const FIELDS = [
    'id', 'title', 'creators', 'creation_date', 'culture', 'technique', 'type',
    'department', 'current_location', 'images', 'url', 'description', 'measurements',
].join(',');

function searchParams(query) {
    const params = new URLSearchParams({ has_image: 1, fields: FIELDS });
    if (query.onView) params.set('currently_on_view', '');

    switch (query.mode) {
        case 'artist':
            params.set('artists', query.term);
            break;
        case 'byArtist':
            params.set('artists', query.artistName);
            break;
        case 'artwork':
            params.set('title', query.term);
            break;
        // Cleveland has no style field, so a style is a keyword search.
        case 'style':
        case 'keyword':
            params.set('q', query.term);
            break;
        default:
            break;
    }
    return params;
}

function normalize(a) {
    const artists = (a.creators ?? []).filter((c) => !c.role || c.role === 'artist');
    const first = artists[0] ?? a.creators?.[0];
    // "Claude Monet (French, 1840–1926)" -> "Claude Monet"
    const name = first?.description?.replace(/\s*\(.*\)\s*$/, '');
    const web = a.images?.web;
    const large = a.images?.print ?? web;

    return {
        key: `cleveland-${a.id}`,
        source: 'cleveland',
        id: a.id,
        title: a.title || 'Untitled',
        artist: name || a.culture?.[0] || 'Unknown artist',
        artistDisplay: artists.map((c) => c.description).join('\n') || a.culture?.join(', '),
        artistId: null,
        canSearchArtist: Boolean(name) && !/unknown/i.test(name),
        date: a.creation_date,
        style: null,
        image: web?.url,
        imageLarge: large?.url ?? web?.url,
        width: Number(web?.width) || null,
        height: Number(web?.height) || null,
        lqip: null,
        altText: null,
        description: a.description,
        url: a.url,
        onView: Boolean(a.current_location),
        // "222 Impressionism & Post-Impressionism" -> "Gallery 222, Impressionism & Post-Impressionism"
        location: a.current_location
            ? a.current_location.replace(/^(\w+)\s+(.*)$/, 'Gallery $1, $2')
            : null,
        details: [
            ['Date', a.creation_date],
            ['Type', a.type],
            ['Medium', a.technique],
            ['Culture', a.culture?.join(', ')],
            ['Department', a.department],
            ['Dimensions', a.measurements],
        ],
    };
}

/** Returns { items, total, totalPages } for one page of Cleveland results. */
export async function searchCleveland(query, { page, limit }, signal) {
    const params = searchParams(query);
    params.set('limit', limit);
    params.set('skip', (page - 1) * limit);

    const response = await fetch(`${CLEVELAND_API}/artworks/?${params}`, { signal });
    if (!response.ok) {
        console.error('Cleveland API error', response.status, await response.text());
        throw new Error(`Cleveland request failed with status ${response.status}`);
    }
    const result = await response.json();
    const total = result.info?.total ?? 0;
    return {
        items: (result.data ?? []).filter((a) => a.images?.web?.url).map(normalize),
        total,
        totalPages: Math.ceil(total / limit),
    };
}
