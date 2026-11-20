import { useState } from "react";

// Light by default. The choice is saved in this browser; index.html applies it
// before the page draws, so there's no flash of the wrong theme on load.
const STORAGE_KEY = "theme";

function currentTheme() {
    return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function ThemeToggle() {
    const [theme, setTheme] = useState(currentTheme);
    const dark = theme === "dark";

    const toggle = () => {
        const next = dark ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // Storage unavailable: the theme still changes for this visit.
        }
        setTheme(next);
    };

    return (
        <button
            type="button"
            onClick={toggle}
            aria-pressed={dark}
            aria-label="Dark mode"
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/65 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
            {dark ? (
                // Sun: shown in dark mode, switches to light.
                <svg aria-hidden="true" viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <circle cx="10" cy="10" r="3.5" />
                    <path d="M10 2v1.5M10 16.5V18M2 10h1.5M16.5 10H18M4.3 4.3l1.1 1.1M14.6 14.6l1.1 1.1M4.3 15.7l1.1-1.1M14.6 5.4l1.1-1.1" />
                </svg>
            ) : (
                // Moon: shown in light mode, switches to dark.
                <svg aria-hidden="true" viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
                    <path d="M16.5 12.2A7 7 0 0 1 7.8 3.5a7 7 0 1 0 8.7 8.7Z" />
                </svg>
            )}
        </button>
    );
}
