// Artist gender from Wikidata (property P21, "sex or gender").
// None of the museum APIs record gender, so the stats page looks it up for
// each museum's most-collected artists on Wikidata.

const SPARQL = 'https://query.wikidata.org/sparql';
const FEMALE = new Set(['Q6581072', 'Q1052281']); // female, trans woman
const MALE = new Set(['Q6581097', 'Q2449503']); // male, trans man

/**
 * artists: [{ key, name, ulanId?, wikidataId? }]
 * Matches each artist by Wikidata ID, then Getty ULAN ID, then (if neither is
 * known) by exact name or alternative name among people on Wikidata. Returns
 * Map(key -> 'woman' | 'man' | 'other'); unmatched artists are left out
 * (shown as "not recorded").
 */
export async function lookupGenders(artists, signal) {
    const qidToKey = new Map();
    const ulanToKey = new Map();
    const nameToKey = new Map();
    for (const a of artists) {
        if (a.wikidataId) qidToKey.set(String(a.wikidataId).replace(/^.*\//, ''), a.key);
        else if (a.ulanId) ulanToKey.set(String(a.ulanId), a.key);
        else if (a.name) nameToKey.set(a.name, a.key);
    }

    const literal = (text) => `"${text.replace(/["\\]/g, '')}"@en`;
    const branches = [];
    if (qidToKey.size) {
        branches.push(`{ VALUES ?item { ${[...qidToKey.keys()].map((q) => `wd:${q}`).join(' ')} } }`);
    }
    if (ulanToKey.size) {
        branches.push(`{ VALUES ?ulan { ${[...ulanToKey.keys()].map((u) => `"${u}"`).join(' ')} } ?item wdt:P245 ?ulan . }`);
    }
    if (nameToKey.size) {
        branches.push(`{ VALUES ?name { ${[...nameToKey.keys()].map(literal).join(' ')} }
    ?item rdfs:label|skos:altLabel ?name ; wdt:P31 wd:Q5 . }`);
    }
    if (!branches.length) return new Map();

    const query = `SELECT ?item ?ulan ?name ?gender WHERE {
  ${branches.join('\n  UNION\n  ')}
  ?item wdt:P21 ?gender .
}`;
    const response = await fetch(`${SPARQL}?format=json&query=${encodeURIComponent(query)}`, { signal });
    if (!response.ok) throw new Error(`Wikidata request failed (${response.status})`);
    const { results } = await response.json();

    const genders = new Map();
    for (const row of results.bindings) {
        const qid = row.item.value.replace(/^.*\//, '');
        const key = row.ulan ? ulanToKey.get(row.ulan.value)
            : row.name ? nameToKey.get(row.name.value)
                : qidToKey.get(qid);
        // A name can match more than one person; the first match is kept.
        if (key === undefined || genders.has(key)) continue;
        const g = row.gender.value.replace(/^.*\//, '');
        genders.set(key, FEMALE.has(g) ? 'woman' : MALE.has(g) ? 'man' : 'other');
    }
    return genders;
}

/** Summarise genders for a list of [{ key, name, count }] artists. */
export function summariseGender(artists, genders) {
    const summary = {
        artists: { woman: 0, man: 0, other: 0, unknown: 0 },
        works: { woman: 0, man: 0, other: 0, unknown: 0 },
        total: artists.length,
        totalWorks: artists.reduce((sum, a) => sum + a.count, 0),
    };
    for (const a of artists) {
        const g = genders.get(a.key) ?? 'unknown';
        summary.artists[g] += 1;
        summary.works[g] += a.count;
    }
    return summary;
}
