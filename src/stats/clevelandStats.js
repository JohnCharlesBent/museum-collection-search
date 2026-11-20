// Cleveland Museum of Art: every count is the total from one quick search.
// The API can't group works by artist, so there are no top-artist stats, but
// its `female_artists` filter gives an exact count of works by women.
import { getJson, mapLimit, centuryLabel } from './util.js';
import { CLEVELAND_API } from '../api/cleveland.js';

// Cleveland's departments (Appendix B of its API docs).
const DEPARTMENTS = [
    'African Art', 'American Painting and Sculpture', 'Art of the Americas', 'Chinese Art',
    'Contemporary Art', 'Decorative Art and Design', 'Drawings',
    'Egyptian and Ancient Near Eastern Art', 'European Painting and Sculpture',
    'Greek and Roman Art', 'Indian and South East Asian Art', 'Islamic Art', 'Japanese Art',
    'Korean Art', 'Medieval Art', 'Modern European Painting and Sculpture', 'Oceania',
    'Performing Arts, Music, & Film', 'Photography', 'Prints', 'Textiles',
];

const ERAS = [
    { label: 'Before 1000', created_after: -10000, created_before: 999 },
    ...Array.from({ length: 11 }, (_, i) => {
        const start = 1000 + i * 100;
        return { label: centuryLabel(start), created_after: start, created_before: start + 99 };
    }),
];

async function count(params, signal) {
    // `fields` keeps the response small (and avoids an error on bare requests).
    const search = new URLSearchParams({ limit: 1, fields: 'id', ...params });
    const result = await getJson(`${CLEVELAND_API}/artworks/?${search}`, signal);
    return result.info?.total ?? 0;
}

export async function loadClevelandStats(signal, onProgress) {
    onProgress?.('Counting the collection');
    const [total, onView, women, womenOnView] = await Promise.all([
        count({}, signal),
        count({ currently_on_view: '' }, signal),
        count({ female_artists: '' }, signal),
        count({ female_artists: '', currently_on_view: '' }, signal),
    ]);

    onProgress?.('Counting works by century and department');
    const [eraCounts, deptCounts] = await Promise.all([
        mapLimit(ERAS, 6, (era) => count({ created_after: era.created_after, created_before: era.created_before }, signal)),
        mapLimit(DEPARTMENTS, 6, (department) => count({ department }, signal)),
    ]);

    return {
        museum: 'cleveland',
        total,
        onView,
        eras: { unit: 'century', rows: ERAS.map((e, i) => ({ label: e.label, value: eraCounts[i] })) },
        types: {
            title: 'Departments',
            rows: DEPARTMENTS
                .map((label, i) => ({ label, value: deptCounts[i] }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 12),
        },
        styles: null,
        artists: null,
        gender: null,
        womenShare: { women, total, womenOnView, onView },
        unavailable: {
            styles: 'Cleveland doesn’t record a style for its works.',
            artists: 'Cleveland’s API can only count works matching a search, not group them by artist, so its most-collected artists can’t be worked out without reading all of its records. The share of works by women is below.',
        },
        notes: [
            'Each figure is the total from one Cleveland search, across the whole collection including works without images.',
            'Works by women use Cleveland’s own “female artists” tag.',
            'Century counts use each work’s creation date range, so a work spanning two centuries can count in both.',
        ],
    };
}
