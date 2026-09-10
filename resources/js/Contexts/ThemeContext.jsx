import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

function applyThemeClass(isDark) {
    const root = document.documentElement;
    if (isDark) {
        root.classList.add("dark");
        localStorage.setItem("theme", "dark");
    } else {
        root.classList.remove("dark");
        localStorage.setItem("theme", "light");
    }
}

/** Suppress color/background transitions while the `dark` class toggles. */
function disableTransitionsTemporarily() {
    const style = document.createElement("style");
    style.setAttribute("data-theme-transition-disable", "");
    style.appendChild(
        document.createTextNode(
            `*, *::before, *::after {
                -webkit-transition: none !important;
                -moz-transition: none !important;
                -o-transition: none !important;
                transition: none !important;
            }`,
        ),
    );
    document.head.appendChild(style);

    return style;
}

function restoreTransitions(style) {
    if (!style?.parentNode) {
        return;
    }

    // Force layout so the theme class applies before transitions return.
    void document.documentElement.offsetHeight;

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            style.remove();
        });
    });
}

export function ThemeProvider({ children }) {
    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem("theme");
            if (stored) {
                return stored === "dark";
            }

            return window.matchMedia("(prefers-color-scheme: dark)").matches;
        }

        return false;
    });

    useEffect(() => {
        applyThemeClass(darkMode);
    }, [darkMode]);

    const toggleTheme = () => {
        const style = disableTransitionsTemporarily();

        setDarkMode((prev) => {
            const next = !prev;
            applyThemeClass(next);

            return next;
        });

        restoreTransitions(style);
    };

    return (
        <ThemeContext.Provider value={{ darkMode, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }

    return context;
}

export default ThemeContext;
