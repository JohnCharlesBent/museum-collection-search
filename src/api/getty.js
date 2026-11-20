// J. Paul Getty Museum (https://data.getty.edu/museum/collection/docs/).
// No key needed. Searches run as SPARQL queries over the Getty's Linked Art
// data, then each result's full record is fetched as JSON-LD.
//
// The endpoint has no full-text index, so searches are kept simple:
// - artist: find matching people first (fast), then their works
// - artwork, keyword and style: match words in the title
// Style isn't recorded as a searchable field, so a style search only finds
// titles that mention it.

const SPARQL = 'https://data.getty.edu/museum/collection/sparql';
const GALLERY = '<http://vocab.getty.edu/aat/300240057>'; // "Galleries (Display Spaces)"

const PREFIXES = `PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
`;

export async function sparql(query, signal) {
    const response = await fetch(SPARQL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/sparql-query',
            Accept: 'application/sparql-results+json',
        },
        body: PREFIXES + query,
        signal,
    });
    if (!response.ok) {
        console.error('Getty SPARQL error', response.status, await response.text());
        throw new Error(`Getty request failed with status ${response.status}`);
    }
    const { results } = await response.json();
    return results.bindings;
}

// Text for a SPARQL string literal: lowercase, without quotes or backslashes.
const literal = (text) => `"${text.toLowerCase().replace(/["\\\n\r]/g, ' ').trim()}"`;

// People whose name contains the text (the fast first step of an artist search).
async function findPeople(name, signal) {
    const rows = await sparql(`SELECT ?p WHERE {
  ?p a crm:E21_Person ; rdfs:label ?name .
  FILTER(CONTAINS(LCASE(STR(?name)), ${literal(name)}))
} LIMIT 60`, signal);
    return rows.map((r) => `<${r.p.value}>`);
}

// The SPARQL pattern selecting matching works with images.
async function pattern(query, signal) {
    const onView = query.onView
        ? `?obj crm:P55_has_current_location ?loc . ?loc crm:P2_has_type ${GALLERY} .`
        : '';
    const base = `?obj a crm:E22_Human-Made_Object ; crm:P138i_has_representation ?rep . ${onView}`;

    switch (query.mode) {
        case 'artist':
        case 'byArtist': {
            const people = query.mode === 'byArtist' && query.gettyPersonId
                ? [`<${query.gettyPersonId}>`]
                : await findPeople(query.mode === 'artist' ? query.term : query.artistName, signal);
            if (!people.length) return null;
            return `VALUES ?p { ${people.join(' ')} }
  ?obj crm:P108i_was_produced_by/crm:P14_carried_out_by ?p .
  ${base}`;
        }
        case 'artwork':
        case 'keyword':
        case 'style':
            return `${base}
  ?obj rdfs:label ?label .
  FILTER(CONTAINS(LCASE(STR(?label)), ${literal(query.term)}))`;
        default:
            return base;
    }
}

// --- Reading a Linked Art record ------------------------------------------

const statement = (o, label) => o.referred_to_by?.find((r) => r._label === label)?.content;

function title(o) {
    const names = (o.identified_by ?? []).filter((n) => n.type === 'Name');
    const preferred = names.find((n) => n.classified_as?.some((c) => c._label === 'Preferred Term'));
    return (preferred ?? names[0])?.content ?? o._label?.replace(/\s*\([^)]*\)\s*$/, '') ?? 'Untitled';
}

// The Getty has two sites, so the site name is kept after the gallery.
function gettyLocation(label) {
    const match = /^(Getty (?:Center|Villa)),\s*(?:Museum\s+)?(.*)$/.exec(label ?? '');
    return match ? `${match[2]} (${match[1]})` : label;
}

function normalize(o) {
    const production = o.produced_by;
    const maker = production?.carried_out_by?.[0];
    const makerText = (label) => production?.referred_to_by?.find((r) => r._label === label)?.content;
    const imageBase = o.representation?.[0]?.id?.replace(/\/full\/full\/0\/default\.jpg$/, '');
    const location = o.current_location;
    const inGallery = location?.classified_as?.some((c) => c.id === 'http://vocab.getty.edu/aat/300240057');
    // HTML version of the description, if there is one.
    const descriptions = (o.referred_to_by ?? []).filter((r) => r._label === 'Object Description');
    const description = (descriptions.find((d) => d.content?.startsWith('<')) ?? descriptions[0])?.content;

    return {
        key: `getty-${o.id}`,
        source: 'getty',
        id: o.id,
        title: title(o),
        artist: makerText('Artist/Maker (Producer) Name') || maker?._label || 'Unknown maker',
        artistDisplay: makerText('Artist/Maker (Producer) Description') || maker?._label,
        artistId: maker?.id ?? null,
        canSearchArtist: Boolean(maker?.id) && !/unknown/i.test(maker?._label ?? ''),
        date: production?.timespan?.identified_by?.[0]?.content,
        style: null,
        image: imageBase && `${imageBase}/full/600,/0/default.jpg`,
        imageLarge: imageBase && `${imageBase}/full/!1600,1600/0/default.jpg`,
        width: null,
        height: null,
        lqip: null,
        altText: null,
        description,
        url: o.subject_of?.find((s) => s.format === 'text/html')?.id,
        onView: Boolean(inGallery),
        // "Getty Center, Museum West Pavilion, Gallery W204" -> "West Pavilion, Gallery W204 (Getty Center)"
        location: inGallery ? gettyLocation(location._label) : null,
        details: [
            ['Date', production?.timespan?.identified_by?.[0]?.content],
            ['Object type', statement(o, 'Object Type')],
            ['Medium', statement(o, 'Materials Description')],
            ['Culture', statement(o, 'Culture Statement')],
            ['Place made', statement(o, 'Place Created')],
            ['Dimensions', statement(o, 'Dimensions Statement')],
            ['Credit line', statement(o, 'Source Credit Line')],
        ],
    };
}

async function fetchRecord(uri, signal) {
    const response = await fetch(uri, { signal });
    return response.ok ? response.json() : null;
}

/** Returns { items, total, totalPages } for one page of Getty results. */
export async function searchGetty(query, { page, limit }, signal) {
    const where = await pattern(query, signal);
    if (!where) return { items: [], total: 0, totalPages: 0 };

    const [rows, countRows] = await Promise.all([
        sparql(`SELECT DISTINCT ?obj WHERE {
  ${where}
} ORDER BY ?obj LIMIT ${limit} OFFSET ${(page - 1) * limit}`, signal),
        sparql(`SELECT (COUNT(DISTINCT ?obj) AS ?n) WHERE {
  ${where}
}`, signal),
    ]);
    const total = Number(countRows[0]?.n?.value ?? 0);

    const records = await Promise.allSettled(rows.map((r) => fetchRecord(r.obj.value, signal)));
    signal?.throwIfAborted();
    return {
        items: records
            .map((r) => (r.status === 'fulfilled' ? r.value : null))
            .filter((o) => o?.representation?.length)
            .map(normalize),
        total,
        totalPages: Math.ceil(total / limit),
    };
}
