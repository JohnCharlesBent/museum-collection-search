// Art Institute of Chicago: its search API supports Elasticsearch
// aggregations, so whole-collection counts take only a few requests.
import { getJson, centuryLabel } from './util.js';
import { lookupGenders, summariseGender } from './gender.js';

const BASE = import.meta.env?.DEV ? '/aic' : 'https://api.artic.edu';
const SEARCH = `${BASE}/api/v1/artworks/search`;
const TOP_ARTISTS = 30;

// AIC's style list mixes in periods and cultures ("19th century",
// "Japanese (culture or style)", and lowercase imports like "greek" or
// "qing"). Only capitalised movement names are kept for the style chart.
const NOT_A_STYLE = /century|culture|dynasty|period|asian|himalayan|islamic|african|indian|american/i;
const isStyle = (term) => /^[A-Z]/.test(term) && !NOT_A_STYLE.test(term);

export async function loadAicStats(signal, onProgress) {
    onProgress?.('Counting the collection');
    const aggs = [
        'aggs[types][terms][field]=artwork_type_title.keyword',
        'aggs[types][terms][size]=10',
        'aggs[styles][terms][field]=style_title.keyword',
        'aggs[styles][terms][size]=60',
        'aggs[artists][terms][field]=artist_id',
        'aggs[artists][terms][size]=80',
        'aggs[era][histogram][field]=date_start',
        'aggs[era][histogram][interval]=100',
        'aggs[era][histogram][min_doc_count]=1',
    ].join('&');
    const [all, onView] = await Promise.all([
        getJson(`${SEARCH}?limit=0&${aggs}`, signal),
        getJson(`${SEARCH}?limit=0&query[term][is_on_view]=true`, signal),
    ]);
    const { aggregations: a } = all;

    // Eras: centuries from 1000 on, everything earlier in one bar.
    let before1000 = 0;
    const centuries = [];
    for (const b of a.era.buckets) {
        if (b.key < -10000 || b.key > 2100) continue; // bad dates in the data
        if (b.key < 1000) before1000 += b.doc_count;
        else centuries.push({ label: centuryLabel(b.key), value: b.doc_count });
    }
    const eras = [{ label: 'Before 1000', value: before1000 }, ...centuries];

    // Artists: aggregate by id, then fetch names and IDs for the top ones,
    // skipping placeholders like "Unknown artist" or "Ancient Roman".
    onProgress?.('Looking up the most-collected artists');
    const ids = a.artists.buckets.map((b) => b.key);
    const agents = await getJson(
        `${BASE}/api/v1/agents?ids=${ids.join(',')}&limit=${ids.length}&fields=id,title,ulan_id,wikidata_id,agent_type_title`,
        signal,
    );
    const agentById = new Map(agents.data.map((ag) => [ag.id, ag]));
    const artists = a.artists.buckets
        .map((b) => ({ agent: agentById.get(b.key), count: b.doc_count }))
        .filter(({ agent }) => agent && agent.agent_type_title === 'Individual'
            && !/unknown|anonymous|ancient/i.test(agent.title))
        .slice(0, TOP_ARTISTS)
        .map(({ agent, count }) => ({
            key: agent.id,
            name: agent.title,
            count,
            ulanId: agent.ulan_id,
            wikidataId: agent.wikidata_id,
        }));

    onProgress?.('Checking artists on Wikidata');
    let gender = null;
    try {
        gender = summariseGender(artists, await lookupGenders(artists, signal));
    } catch (err) {
        if (err.name === 'AbortError') throw err;
        console.error('Wikidata lookup failed', err);
    }

    return {
        museum: 'aic',
        total: all.pagination.total,
        onView: onView.pagination.total,
        eras: { unit: 'century', rows: eras },
        types: {
            title: 'Types of work',
            rows: a.types.buckets.map((b) => ({ label: b.key, value: b.doc_count })),
        },
        styles: a.styles.buckets
            .filter((b) => isStyle(b.key))
            .slice(0, 15)
            .map((b) => ({ label: b.key, value: b.doc_count })),
        artists: artists.map((x) => ({ label: x.name, value: x.count })),
        gender,
        notes: [
            'Counts come from the Art Institute’s search API across its whole collection, including works without images.',
            'Dates use each work’s start date. A few records with impossible dates are left out.',
            'The style list shows art movements only. The Art Institute also files periods and cultures (like “19th century”, “Japanese” or “qing”) under style; those are left out.',
            'Artist placeholders such as “Unknown artist” or “Ancient Roman” aren’t counted as artists.',
        ],
    };
}
