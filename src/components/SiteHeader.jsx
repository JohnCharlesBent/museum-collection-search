import { SOURCES } from "../api/search.js";

const museums = Object.values(SOURCES).map((m) => m.short);
const museumList = museums.length > 1
    ? `${museums.slice(0, -1).join(", ")} and ${museums.at(-1)}`
    : museums[0];

const links = [
    { href: "/", label: "Search" },
    { href: "/stats", label: "Collection stats" },
];

export function SiteHeader({ current, onHome }) {
    return (
        <header className="bg-ink text-white">
            <div className="mx-auto flex max-w-7xl flex-wrap items-baseline gap-x-6 gap-y-2 px-6 py-5">
                <div className="flex items-baseline gap-3">
                    <a
                        href="/"
                        onClick={onHome}
                        className="text-base font-semibold tracking-tight text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                    >
                        Collection search
                    </a>
                    <span className="hidden text-sm text-white/65 sm:inline">
                        {museumList}
                    </span>
                </div>
                <nav aria-label="Main" className="flex gap-4 sm:ml-auto">
                    {links.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            aria-current={current === link.href ? "page" : undefined}
                            className={`text-sm underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${current === link.href ? "font-medium text-white underline decoration-white" : "text-white/65 hover:text-white"}`}
                        >
                            {link.label}
                        </a>
                    ))}
                </nav>
            </div>
        </header>
    );
}
