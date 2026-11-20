// Harvard Art Museums API (https://github.com/harvardartmuseums/api-docs).
// Every request needs an API key. The key lives in .env.local as
// HARVARD_API_KEY and is added by the Vite dev server (see vite.config.js),
// so it never reaches the browser. Harvard only appears in the app when a
// key is set. Terms: non-commercial use, at most 2,500 requests a day.

export const HARVARD_ENABLED = import.meta.env?.VITE_HARVARD_ENABLED === 'true';
export const HARVARD_API = '/harvard';

const FIELDS = [
    'id', 'title', 'people', 'dated', 'style', 'period', 'culture', 'classification',
    'medium', 'technique', 'dimensions', 'primaryimageurl', 'images', 'gallery', 'url',
    'description', 'labeltext', 'creditline',
].join(',');

// The search API won't page past the first 10,000 results.
const MAX_RESULTS = 10000;

const quote = (text) => `"${text.replace(/"/g, '')}"`;

function searchParams(query) {
    const params = new URLSearchParams({ hasimage: 1, fields: FIELDS });
    if (query.onView) params.set('gallery', 'any');

    switch (query.mode) {
        case 'artist':
            params.set('person', query.term);
            break;
        case 'byArtist':
            // A Harvard person id is exact; a name (from another museum's card) is matched.
            params.set('person', query.harvardPersonId ?? query.artistName);
            break;
        case 'artwork':
            params.set('title', query.term);
            break;
        case 'style':
            params.set('q', `style:${quote(query.term)} OR period:${quote(query.term)}`);
            break;
        case 'keyword':
            params.set('keyword', query.term);
            break;
        default:
            // Browsing: most-viewed works first.
            params.set('sort', 'totalpageviews');
            params.set('sortorder', 'desc');
    }
    return params;
}

// IIIF image URL, never wider than the original (wider requests can fail).
function iiif(base, wanted, originalWidth) {
    const width = originalWidth ? Math.min(wanted, originalWidth) : wanted;
    return `${base}/full/${width},/0/default.jpg`;
}

function normalize(o) {
    const artists = (o.people ?? [])
        .filter((p) => p.role === 'Artist')
        .sort((a, b) => a.displayorder - b.displayorder);
    const first = artists[0] ?? o.people?.[0];
    const name = first?.displayname || first?.name;
    const image = o.images?.[0];
    const base = o.primaryimageurl || image?.baseimageurl;

    return {
        key: `harvard-${o.id}`,
        source: 'harvard',
        id: o.id,
        title: o.title || 'Untitled',
        artist: name || o.culture || 'Unknown artist',
        artistDisplay: artists
            .map((p) => [p.displayname || p.name, [p.culture, p.displaydate].filter(Boolean).join(', ')]
                .filter(Boolean).join('\n'))
            .join('\n\n') || o.culture,
        artistId: first?.personid ?? null,
        canSearchArtist: Boolean(name) && !/unknown/i.test(name),
        date: o.dated,
        style: o.style || null,
        image: iiif(base, 600, image?.width),
        imageLarge: iiif(base, 1600, image?.width),
        width: image?.width,
        height: image?.height,
        lqip: null,
        altText: image?.alttext || null,
        description: o.description || o.labeltext || null,
        url: o.url,
        onView: Boolean(o.gallery),
        location: o.gallery ? `Gallery ${o.gallery.gallerynumber}` : null,
        details: [
            ['Date', o.dated],
            ['Style', o.style],
            ['Period', o.period],
            ['Culture', o.culture],
            ['Classification', o.classification],
            ['Medium', o.medium || o.technique],
            ['Dimensions', o.dimensions],
            ['Credit line', o.creditline],
        ],
    };
}

/** Returns { items, total, totalPages } for one page of Harvard results. */
export async function searchHarvard(query, { page, limit }, signal) {
    if (page * limit > MAX_RESULTS) return { items: [], total: 0, totalPages: 0 };
    const params = searchParams(query);
    params.set('size', limit);
    params.set('page', page);

    const response = await fetch(`${HARVARD_API}/object?${params}`, { signal });
    if (!response.ok) {
        console.error('Harvard API error', response.status, await response.text());
        throw new Error(`Harvard request failed with status ${response.status}`);
    }
    const result = await response.json();
    const total = result.info?.totalrecords ?? 0;
    return {
        items: (result.records ?? []).filter((o) => o.primaryimageurl || o.images?.length).map(normalize),
        total,
        totalPages: Math.ceil(Math.min(total, MAX_RESULTS) / limit),
    };
}
