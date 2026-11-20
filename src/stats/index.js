import { loadAicStats } from './aicStats.js';
import { loadMetStats } from './metStats.js';
import { loadWhitneyStats } from './whitneyStats.js';
import { loadHarvardStats } from './harvardStats.js';
import { loadGettyStats } from './gettyStats.js';
import { loadClevelandStats } from './clevelandStats.js';
import { readCache, writeCache } from './util.js';

const loaders = { aic: loadAicStats, met: loadMetStats, whitney: loadWhitneyStats, getty: loadGettyStats, cleveland: loadClevelandStats, harvard: loadHarvardStats };

/** Saved stats for a museum (possibly stale), or null. */
export function cachedStats(museum) {
    return readCache(museum);
}

/** Fetch fresh stats from the museum's API and save them. */
export async function syncStats(museum, { signal, onProgress } = {}) {
    const data = await loaders[museum](signal, onProgress);
    writeCache(museum, data);
    return { ...data, savedAt: Date.now(), stale: false };
}
