// Harvard Art Museums: the API supports Elasticsearch aggregations on both
// objects and people, and people records include gender and a count of
// their works, so gender can be counted across the whole collection.
import { getJson, centuryLabel } from './util.js';
import { summariseGender } from './gender.js';
import { HARVARD_API } from '../api/harvard.js';

const TOP_ARTISTS = 30;

function url(resource, params) {
    const search = new URLSearchParams(params);
    return `${HARVARD_API}/${resource}?${search}`;
}

const agg = (spec) => ({ size: 0, aggregation: JSON.stringify(spec) });

// Harvard's gender values are "male", "female", "unknown" and a few others.
function genderKey(value) {
    if (value === 'female') return 'woman';
    if (value === 'male') return 'man';
    if (!value || value === 'unknown') return 'unknown';
    return 'other';
}

export async function loadHarvardStats(signal, onProgress) {
    onProgress?.('Counting the collection');
    const [objects, onView, styles] = await Promise.all([
        getJson(url('object', agg({
            types: { terms: { field: 'classification.exact', size: 10 } },
            era: { histogram: { field: 'datebegin', interval: 100, min_doc_count: 1 } },
        })), signal),
        getJson(url('object', { size: 0, gallery: 'any' }), signal),
        // Style may not support aggregation; the page explains if it doesn't.
        getJson(url('object', agg({ styles: { terms: { field: 'style.exact', size: 15 } } })), signal)
            .catch((err) => {
                if (err.name === 'AbortError') throw err;
                console.error('Harvard style aggregation failed', err);
                return null;
            }),
    ]);
    const a = objects.aggregations;

    let before1000 = 0;
    const centuries = [];
    for (const b of a.era.buckets) {
        if (b.key < -10000 || b.key > 2100) continue;
        if (b.key < 1000) before1000 += b.doc_count;
        else centuries.push({ label: centuryLabel(b.key), value: b.doc_count });
    }

    onProgress?.('Looking up the most-collected artists');
    const [people, byGender] = await Promise.all([
        getJson(url('person', {
            size: TOP_ARTISTS + 20,
            sort: 'objectcount',
            sortorder: 'desc',
            fields: 'personid,displayname,objectcount,gender',
        }), signal),
        getJson(url('person', agg({
            genders: { terms: { field: 'gender', size: 10 }, aggs: { works: { sum: { field: 'objectcount' } } } },
        })), signal),
    ]);

    const artists = people.records
        .filter((p) => p.displayname && !/unknown|anonymous|unidentified/i.test(p.displayname))
        .slice(0, TOP_ARTISTS)
        .map((p) => ({ key: p.personid, name: p.displayname, count: p.objectcount, gender: genderKey(p.gender) }));
    const gender = summariseGender(artists, new Map(
        artists.filter((x) => x.gender !== 'unknown').map((x) => [x.key, x.gender]),
    ));

    // Whole-collection split: people by gender, and the works linked to them.
    const collectionGender = {
        artists: { woman: 0, man: 0, other: 0, unknown: 0 },
        works: { woman: 0, man: 0, other: 0, unknown: 0 },
        total: 0,
        totalWorks: 0,
    };
    for (const b of byGender.aggregations.genders.buckets) {
        const g = genderKey(b.key);
        collectionGender.artists[g] += b.doc_count;
        collectionGender.works[g] += b.works.value;
        collectionGender.total += b.doc_count;
        collectionGender.totalWorks += b.works.value;
    }

    const styleRows = styles?.aggregations?.styles?.buckets?.map((b) => ({ label: b.key, value: b.doc_count }));

    return {
        museum: 'harvard',
        total: objects.info.totalrecords,
        onView: onView.info.totalrecords,
        eras: { unit: 'century', rows: [{ label: 'Before 1000', value: before1000 }, ...centuries] },
        types: {
            title: 'Types of work',
            rows: a.types.buckets.map((b) => ({ label: b.key, value: b.doc_count })),
        },
        styles: styleRows?.length ? styleRows : null,
        artists: artists.map((x) => ({ label: x.name, value: x.count })),
        gender,
        genderSource: 'museum',
        collectionGender,
        unavailable: {
            styles: 'Harvard’s API couldn’t group works by style just now.',
        },
        notes: [
            'Counts come from Harvard’s search API across the whole collection, including works without images.',
            'Gender comes from Harvard’s own records about people. The whole-collection figures add up the works linked to each person, so a work by several people counts once for each.',
            'Dates use each work’s start year.',
        ],
    };
}
