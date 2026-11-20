// J. Paul Getty Museum: counts come from SPARQL queries over the whole
// collection. Counting works by artist takes about 40 seconds, so the
// queries run in parallel and the results are cached like the others.
import { sparql } from '../api/getty.js';
import { lookupGenders, summariseGender } from './gender.js';
import { centuryLabel } from './util.js';

const TOP_ARTISTS = 30;
const GALLERY = '<http://vocab.getty.edu/aat/300240057>';
const count = (rows) => Number(rows[0]?.n?.value ?? 0);

export async function loadGettyStats(signal, onProgress) {
    onProgress?.('Counting the Getty’s collection (this takes about a minute)');
    const [total, onView, types, centuries, artistRows] = await Promise.all([
        sparql('SELECT (COUNT(?obj) AS ?n) WHERE { ?obj a crm:E22_Human-Made_Object }', signal),
        sparql(`SELECT (COUNT(DISTINCT ?obj) AS ?n) WHERE {
  ?obj a crm:E22_Human-Made_Object ; crm:P55_has_current_location ?loc .
  ?loc crm:P2_has_type ${GALLERY} }`, signal),
        sparql(`SELECT ?label (COUNT(DISTINCT ?obj) AS ?n) WHERE {
  ?obj a crm:E22_Human-Made_Object ; crm:P67i_is_referred_to_by ?s .
  ?s rdfs:label "Object Type" ; crm:P190_has_symbolic_content ?label
} GROUP BY ?label ORDER BY DESC(?n) LIMIT 10`, signal),
        // Century from the start date's text ("1889-01-01T…" -> "18"); BCE dates start with "-".
        sparql(`SELECT ?c (COUNT(?obj) AS ?n) WHERE {
  ?obj a crm:E22_Human-Made_Object ;
       crm:P108i_was_produced_by/crm:P4_has_time-span/crm:P82a_begin_of_the_begin ?b .
  BIND(IF(STRSTARTS(STR(?b), "-"), "BCE", SUBSTR(STR(?b), 1, 2)) AS ?c)
} GROUP BY ?c`, signal),
        sparql(`SELECT ?p (SAMPLE(?name) AS ?label) (COUNT(DISTINCT ?obj) AS ?n) WHERE {
  ?obj a crm:E22_Human-Made_Object ; crm:P108i_was_produced_by/crm:P14_carried_out_by ?p .
  ?p rdfs:label ?name
} GROUP BY ?p ORDER BY DESC(?n) LIMIT ${TOP_ARTISTS + 20}`, signal),
    ]);

    // Before 1000 (including BCE) in one bar, then each century.
    let before1000 = 0;
    const centuryRows = [];
    for (const row of centuries) {
        const key = row.c.value;
        const n = Number(row.n.value);
        if (key === 'BCE' || Number(key) < 10) before1000 += n;
        else centuryRows.push({ start: Number(key) * 100, value: n });
    }
    centuryRows.sort((a, b) => a.start - b.start);

    // Artists: skip "Unknown" and companies or studios (names with "& Co." etc.).
    const artists = artistRows
        .map((r) => ({ key: r.p.value, name: r.label.value, count: Number(r.n.value) }))
        .filter((a) => !/^unknown|anonymous|& co\b|company|studio/i.test(a.name))
        .slice(0, TOP_ARTISTS);

    onProgress?.('Checking artists on Wikidata');
    let gender = null;
    try {
        gender = summariseGender(artists, await lookupGenders(artists, signal));
    } catch (err) {
        if (err.name === 'AbortError') throw err;
        console.error('Wikidata lookup failed', err);
    }

    return {
        museum: 'getty',
        total: count(total),
        onView: count(onView),
        eras: {
            unit: 'century',
            rows: [
                { label: 'Before 1000', value: before1000 },
                ...centuryRows.map((c) => ({ label: centuryLabel(c.start), value: c.value })),
            ],
        },
        types: {
            title: 'Types of work',
            rows: types.map((r) => ({ label: r.label.value, value: Number(r.n.value) })),
        },
        styles: null,
        artists: artists.map((a) => ({ label: a.name, value: a.count })),
        gender,
        unavailable: {
            styles: 'The Getty doesn’t record a style for its works in a form that can be counted.',
        },
        notes: [
            'Counts come from the Getty’s SPARQL endpoint across its whole collection, including works without images.',
            '“On view” counts works whose current location is a gallery.',
            'Centuries use each work’s earliest possible date.',
            'Unknown makers and companies (such as publishers of stereographs) aren’t counted as artists.',
        ],
    };
}
