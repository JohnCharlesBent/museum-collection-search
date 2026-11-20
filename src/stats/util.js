// Shared helpers for the stats page.

export async function getJson(url, signal) {
    const response = await fetch(url, { signal });
    if (!response.ok) {
        throw new Error(`Request failed (${response.status}): ${url}`);
    }
    return response.json();
}

// Run async tasks with at most `limit` in flight, so we stay polite to each API.
export async function mapLimit(items, limit, fn) {
    const results = new Array(items.length);
    let next = 0;
    async function worker() {
        while (next < items.length) {
            const i = next++;
            results[i] = await fn(items[i], i);
        }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return results;
}

// Each museum's stats are kept in this browser. They're shown straight away
// and resynced in the background once they're more than a day old.
const CACHE_PREFIX = 'collection-stats:v1:';
export const MAX_AGE = 24 * 60 * 60 * 1000;

/** Cached stats with { savedAt, stale }, or null if there are none. */
export function readCache(key) {
    try {
        const raw = localStorage.getItem(CACHE_PREFIX + key);
        if (!raw) return null;
        const { savedAt, data } = JSON.parse(raw);
        return { ...data, savedAt, stale: Date.now() - savedAt > MAX_AGE };
    } catch {
        return null;
    }
}

export function writeCache(key, data) {
    try {
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ savedAt: Date.now(), data }));
    } catch {
        // Storage full or unavailable: the stats just won't be cached.
    }
}

export function centuryLabel(start) {
    if (start < 0) return `${-start}s BCE`;
    return `${start}s`;
}

// First four-digit year in a free-text date like "c. 1965" or "1941 or 1942".
export function firstYear(text) {
    const match = /\b(1[0-9]{3}|20[0-9]{2})\b/.exec(text ?? '');
    return match ? Number(match[1]) : null;
}
