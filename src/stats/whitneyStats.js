// The Whitney: its API can't group or count by field, but it returns up to
// 1,000 works per page, so the whole collection (~27,000 works) is read in
// about 28 requests and counted here. Results are cached for a day.
import { getJson, mapLimit, firstYear } from './util.js';
import { lookupGenders, summariseGender } from './gender.js';

const API = 'https://whitney.org/api';
const PER_PAGE = 1000;
const TOP_ARTISTS = 30;

function tally(map, key, amount = 1) {
    map.set(key, (map.get(key) ?? 0) + amount);
}

function toRows(map, limit) {
    return [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([label, value]) => ({ label, value }));
}

export async function loadWhitneyStats(signal, onProgress) {
    onProgress?.('Reading the Whitney’s collection');
    const first = await getJson(`${API}/artworks?per_page=${PER_PAGE}&page=1`, signal);
    const pages = Math.ceil(first.meta.total / PER_PAGE);
    let done = 1;
    const rest = await mapLimit(
        Array.from({ length: pages - 1 }, (_, i) => i + 2),
        4,
        async (page) => {
            const result = await getJson(`${API}/artworks?per_page=${PER_PAGE}&page=${page}`, signal);
            done += 1;
            onProgress?.(`Reading the Whitney’s collection (page ${done} of ${pages})`);
            return result;
        },
    );
    const works = [first, ...rest].flatMap((p) => p.data);

    const types = new Map();
    const decades = new Map();
    const artistCounts = new Map();
    let onView = 0;
    let undated = 0;
    for (const { attributes: a, relationships } of works) {
        if (a.on_view) onView += 1;
        tally(types, a.classification || 'Not classified');
        const year = firstYear(a.display_date);
        if (year === null) undated += 1;
        else tally(decades, year < 1900 ? 'Before 1900' : `${Math.floor(year / 10) * 10}s`);
        for (const artist of relationships?.artists?.data ?? []) tally(artistCounts, artist.id);
    }

    // Decades in time order, with "Before 1900" first.
    const eraRows = [...decades.entries()]
        .sort(([a], [b]) => (a === 'Before 1900' ? -1 : b === 'Before 1900' ? 1 : a.localeCompare(b)))
        .map(([label, value]) => ({ label, value }));

    onProgress?.('Looking up the most-collected artists');
    // Fetch a few extra, since placeholders like "Unknown artist" are dropped.
    const topIds = toRows(artistCounts, TOP_ARTISTS + 10);
    const records = await mapLimit(topIds, 6, ({ label: id }) =>
        getJson(`${API}/artists/${id}`, signal).then((r) => r.data.attributes).catch(() => null));
    const artists = topIds
        .map(({ label: id, value }, i) => ({
            key: id,
            name: records[i]?.display_name ?? `Artist ${id}`,
            count: value,
            ulanId: records[i]?.ulan_id,
            wikidataId: records[i]?.wikidata_id,
        }))
        .filter((a) => !/unknown|anonymous/i.test(a.name))
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
        museum: 'whitney',
        total: first.meta.total,
        onView,
        eras: { unit: 'decade', rows: eraRows },
        types: { title: 'Types of work', rows: toRows(types, 10) },
        styles: null,
        artists: artists.map((x) => ({ label: x.name, value: x.count })),
        gender,
        unavailable: {
            styles: 'The Whitney doesn’t record a style for its works.',
        },
        notes: [
            `Counted from all ${first.meta.total.toLocaleString()} works the Whitney’s API returns.`,
            `Decades use the first year in each work’s date. ${undated.toLocaleString()} works have no year and aren’t in the decade chart.`,
            'A work by several artists counts once for each of them. Placeholders such as “Unknown artist” aren’t counted as artists.',
        ],
    };
}
