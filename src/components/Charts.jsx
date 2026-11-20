// Small HTML charts for the stats page. Each one shows its numbers as text,
// so nothing depends on reading bar lengths or colour alone.

const fmt = (n) => n.toLocaleString();
const pct = (part, whole) => (whole ? `${Math.round((part / whole) * 100)}%` : "0%");

/** Ranked horizontal bars: [{ label, value }]. */
export function BarList({ rows, caption }) {
    const max = Math.max(...rows.map((r) => r.value), 1);
    return (
        <table className="w-full border-collapse text-sm">
            {caption && <caption className="sr-only">{caption}</caption>}
            <tbody>
                {rows.map((row) => (
                    <tr key={row.label} className="group" title={`${row.label}: ${fmt(row.value)}`}>
                        <th scope="row" className="w-[40%] py-1.5 pr-4 text-left font-normal leading-snug text-ink">
                            {row.label}
                        </th>
                        <td className="py-1.5">
                            <div className="flex items-center gap-3">
                                <div className="h-3 flex-1">
                                    <div
                                        className="h-full rounded-r-[4px] bg-ink/75 transition-colors group-hover:bg-ink"
                                        style={{ width: `${Math.max((row.value / max) * 100, 0.5)}%` }}
                                    />
                                </div>
                                <span className="w-16 shrink-0 text-right tabular-nums text-muted">{fmt(row.value)}</span>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

/** Columns in time order: [{ label, value }]. */
export function TimeColumns({ rows, caption }) {
    const max = Math.max(...rows.map((r) => r.value), 1);
    const peak = rows.reduce((a, b) => (b.value > a.value ? b : a), rows[0]);
    return (
        <figure>
            <div className="overflow-x-auto">
                <div
                    role="img"
                    aria-label={`${caption}. Highest: ${peak?.label}, ${fmt(peak?.value ?? 0)} works.`}
                    className="flex h-56 min-w-[480px] items-end gap-[2px] border-b border-line"
                >
                    {rows.map((row) => (
                        <div
                            key={row.label}
                            className="group relative flex h-full flex-1 flex-col justify-end"
                            title={`${row.label}: ${fmt(row.value)} works`}
                        >
                            <span className="pointer-events-none absolute -top-1 left-1/2 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded bg-ink px-2 py-1 text-xs text-white group-hover:block">
                                {row.label}: {fmt(row.value)}
                            </span>
                            {row === peak && (
                                <span className="mb-1 text-center text-xs tabular-nums text-muted group-hover:invisible">
                                    {fmt(row.value)}
                                </span>
                            )}
                            <div
                                className="rounded-t-[4px] bg-ink/75 transition-colors group-hover:bg-ink"
                                style={{ height: `${Math.max((row.value / max) * 100, row.value ? 0.8 : 0)}%` }}
                            />
                        </div>
                    ))}
                </div>
                <div className="flex min-w-[480px] gap-[2px] pt-2">
                    {rows.map((row) => (
                        <span key={row.label} className="flex-1 text-center text-[11px] leading-tight text-muted">
                            {row.label}
                        </span>
                    ))}
                </div>
            </div>
            <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-muted hover:text-ink">Show as a table</summary>
                <BarList rows={rows} caption={caption} />
            </details>
        </figure>
    );
}

const GENDER_PARTS = [
    { key: "woman", label: "Women", color: "#a4123f" },
    { key: "man", label: "Men", color: "#2f6db3" },
    { key: "other", label: "Another gender", color: "#1baf7a" },
    { key: "unknown", label: "Not recorded", color: "#c9cbd1" },
    { key: "rest", label: "Everyone else", color: "#c9cbd1" },
];

/** One stacked bar for artists and one for their works. */
export function GenderSplit({ gender, artistsLabel, worksLabel = "Their works", rows: customRows }) {
    const rows = customRows ?? [
        { title: artistsLabel ?? `Artists (top ${gender.total})`, data: gender.artists, total: gender.total },
        { title: worksLabel, data: gender.works, total: gender.totalWorks },
    ];
    const parts = GENDER_PARTS.filter((p) => rows.some((r) => r.data[p.key] > 0));
    return (
        <div>
            <ul className="mb-4 flex flex-wrap gap-x-5 gap-y-1 text-sm" aria-label="Legend">
                {parts.map((p) => (
                    <li key={p.key} className="flex items-center gap-2">
                        <span aria-hidden="true" className="h-3 w-3 rounded-sm" style={{ background: p.color }} />
                        {p.label}
                    </li>
                ))}
            </ul>
            <div className="space-y-4">
                {rows.map((row) => (
                    <div key={row.title}>
                        <p className="mb-1.5 text-sm text-muted">
                            {row.title}:{" "}
                            {parts
                                .filter((p) => row.data[p.key] > 0)
                                .map((p) => `${p.label.toLowerCase()} ${pct(row.data[p.key], row.total)}`)
                                .join(", ")}
                        </p>
                        <div className="flex h-7 gap-[2px] overflow-hidden rounded-[4px]">
                            {parts.map((p) => {
                                const value = row.data[p.key];
                                if (!value) return null;
                                return (
                                    <div
                                        key={p.key}
                                        className="flex items-center overflow-hidden px-2 text-xs font-medium"
                                        style={{
                                            width: `${(value / row.total) * 100}%`,
                                            background: p.color,
                                            color: p.key === "woman" || p.key === "man" ? "#fff" : "var(--color-ink)",
                                        }}
                                        title={`${p.label}: ${fmt(value)} (${pct(value, row.total)})`}
                                    >
                                        {value / row.total >= 0.08 && <span>{pct(value, row.total)}</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
