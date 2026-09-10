/**
 * ShopContext
 * ----------------------------------------------------------------------------
 * Provides the React tree with the list of shops the current user can switch
 * into and the shop that is currently active. Both values are hydrated from
 * Inertia shared props (see app/Http/Middleware/HandleInertiaRequests.php),
 * so this context never makes its own HTTP calls — it only mirrors the
 * server's view of the world.
 *
 * The provider also exposes a `switchShop(slug)` helper that POSTs to the
 * `shops.active.set` route. The server writes the new shop into the session
 * (and the user's `last_shop_id`) and bounces the user back to the page
 * they came from with the new active shop in scope.
 *
 * Companion hook: resources/js/hooks/useActiveShop.js
 * ----------------------------------------------------------------------------
 */
import { router, usePage } from "@inertiajs/react";
import { createContext, useCallback, useEffect, useMemo } from "react";

const ShopContext = createContext(null);

/**
 * Provider that wraps the authenticated app shell. Mounted by MainLayout
 * alongside ThemeProvider so any inventory/category/products page can
 * read the active shop from context without prop drilling.
 *
 * @param {{ children: React.ReactNode }} props
 * @returns {JSX.Element}
 */
export function ShopProvider({ children }) {
    const page = usePage();
    const shops = page.props.shops ?? [];
    const activeShop = page.props.activeShop ?? null;

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        window.__activeShopSlug = activeShop?.slug ?? null;
    }, [activeShop?.slug]);

    /**
     * Switch to the given shop by POSTing to the server's set-active
     * endpoint. The server persists the choice in the session, refreshes
     * the user's `last_shop_id`, and redirects back to the requesting URL
     * (with the new shop in scope).
     *
     * @param {string} slug                 The target shop's slug.
     * @param {{ redirectTo?: string }} [options]
     *     redirectTo — optional URL to land on after the switch. Defaults
     *     to the current page so the user stays where they are with the
     *     new shop selected.
     * @returns {void}
     */
    const switchShop = useCallback(
        (slug, options = {}) => {
            if (!slug) return;

            const redirectTo =
                options.redirectTo ??
                window.location.pathname + window.location.search;

            router.post(
                route("shops.active.set", { shop: slug }),
                { redirect_to: redirectTo },
                {
                    preserveScroll: false,
                    preserveState: false,
                },
            );
        },
        [],
    );

    const value = useMemo(
        () => ({
            shops,
            activeShop,
            switchShop,
            isReady: Boolean(activeShop),
        }),
        [shops, activeShop, switchShop],
    );

    return (
        <ShopContext.Provider value={value}>{children}</ShopContext.Provider>
    );
}

export default ShopContext;
