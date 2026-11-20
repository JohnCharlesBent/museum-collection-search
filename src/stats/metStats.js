// The Met: search only returns totals and IDs, so each count is one search
// (a date range or a department). Artists can't be counted without
// downloading every object record, so the Met has no artist or gender stats.
import { getJson, mapLimit, centuryLabel } from './util.js';

const BASE = import.meta.env?.DEV ? '/met' : 'https://collectionapi.metmuseum.org';
const SEARCH = `${BASE}/public/collection/v1.1/search`;
const API = `${BASE}/public/collection/v1`;

const ERAS = [
    { label: 'Before 1000', begin: -10000, end: 999 },
    ...Array.from({ length: 11 }, (_, i) => {
        const start = 1000 + i * 100;
        return { label: centuryLabel(start), begin: start, end: start + 99 };
    }),
];

async function count(params, signal) {
    const result = await getJson(`${SEARCH}?${new URLSearchParams({ ...params, limit: 1 })}`, signal);
    return result.total ?? 0;
}

export async function loadMetStats(signal, onProgress) {
    onProgress?.('Counting the collection');
    const [total, onView, { departments }] = await Promise.all([
        count({}, signal),
        count({ isOnView: 'true' }, signal),
        getJson(`${API}/departments`, signal),
    ]);

    onProgress?.('Counting works by century');
    const eraCounts = await mapLimit(ERAS, 6, (era) =>
        count({ dateBegin: era.begin, dateEnd: era.end }, signal));

    onProgress?.('Counting works by department');
    const deptCounts = await mapLimit(departments, 6, (d) =>
        count({ departmentId: d.departmentId }, signal));

    return {
        museum: 'met',
        total,
        onView,
        eras: { unit: 'century', rows: ERAS.map((e, i) => ({ label: e.label, value: eraCounts[i] })) },
        types: {
            title: 'Departments',
            rows: departments
                .map((d, i) => ({ label: d.displayName, value: deptCounts[i] }))
                .sort((x, y) => y.value - x.value),
        },
        styles: null,
        artists: null,
        gender: null,
        unavailable: {
            styles: 'The Met doesn’t record a style for its works.',
            artists: 'The Met’s API can only count works matching a search, not group them by artist, so its most-collected artists (and their gender) can’t be worked out without downloading all of its object records.',
        },
        notes: [
            'Each figure is the total from one Met search, so all counts are approximate.',
            'Century counts include works whose date range overlaps the century, so a work dated “1890–1910” counts in both the 1800s and 1900s.',
        ],
    };
}
