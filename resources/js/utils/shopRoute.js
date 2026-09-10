/**
 * shopRoute
 * ----------------------------------------------------------------------------
 * Tiny URL helper utilities for the multi-shop layer. Centralises the
 * "always include `?shop=<slug>` on inventory-style links" rule so each
 * page doesn't have to remember it independently.
 *
 * Usage example (inside an Inventory page):
 *
 *   const { activeShop } = useActiveShop();
 *
 *   router.get(
 *       route("inventory.purchases"),
 *       withShop({ search }, activeShop?.slug),
 *       { preserveState: true, preserveScroll: true },
 *   );
 * ----------------------------------------------------------------------------
 */

/**
 * Merge a `shop` query parameter into a params object so that GET-style
 * navigation preserves the current shop slug across reloads. Returns a
 * new object — never mutates the input.
 *
 * - When `slug` is null/undefined, returns the params unchanged.
 * - When `params.shop` is already set, the existing value wins (so an
 *   explicit override at the call site beats the default).
 *
 * @param {Record<string, unknown>} [params={}]
 *        The base query parameters to extend.
 * @param {string|null|undefined} slug
 *        The active shop's slug (typically `activeShop?.slug`).
 * @returns {Record<string, unknown>}
 */
export function withShop(params = {}, slug) {
    if (!slug || params?.shop !== undefined) {
        return { ...params };
    }

    return { ...params, shop: slug };
}

/**
 * Append `?shop=<slug>` to an absolute or relative URL string, when
 * the URL doesn't already include a `shop` parameter. Useful for static
 * `Link` components where building a route() call would be overkill.
 *
 * @param {string} href                 The URL to extend.
 * @param {string|null|undefined} slug  Active shop slug, optional.
 * @returns {string}
 */
export function appendShopToUrl(href, slug) {
    if (!slug || !href) return href;

    try {
        const isAbsolute = /^https?:\/\//i.test(href);
        const base = isAbsolute ? undefined : window.location.origin;
        const url = new URL(href, base);

        if (!url.searchParams.has("shop")) {
            url.searchParams.set("shop", slug);
        }

        return isAbsolute ? url.toString() : url.pathname + url.search + url.hash;
    } catch {
        // Malformed URL — fall back to a naive append so callers never crash
        const sep = href.includes("?") ? "&" : "?";
        return href.includes("shop=") ? href : `${href}${sep}shop=${encodeURIComponent(slug)}`;
    }
}
