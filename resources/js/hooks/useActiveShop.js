/**
 * useActiveShop
 * ----------------------------------------------------------------------------
 * Convenience hook that exposes the current ShopContext value to any
 * component inside the authenticated app shell. Use this hook anywhere you
 * need to:
 *
 *   - Read the currently active shop (`activeShop.id`, `.slug`, `.name`)
 *   - Render a list of shops the user can switch to (`shops`)
 *   - Trigger a shop switch (`switchShop(slug)`)
 *
 * Throws an explicit error when used outside `<ShopProvider>` so misuse is
 * caught at development time rather than producing silent undefined values.
 *
 * The returned object is stable across renders unless the underlying Inertia
 * shared props change, so it's safe to put on dependency arrays.
 * ----------------------------------------------------------------------------
 */
import { useContext } from "react";

import ShopContext from "@/Contexts/ShopContext";

/**
 * @typedef {Object} ShopSummary
 * @property {number}  id
 * @property {string}  slug
 * @property {string}  name
 * @property {string|null} address
 * @property {boolean} is_default
 */

/**
 * @typedef {Object} ShopContextValue
 * @property {ShopSummary[]}            shops       Shops the user can switch into.
 * @property {ShopSummary|null}         activeShop  Currently active shop, or null
 *                                                  if no shop is resolvable yet.
 * @property {(slug: string, options?: { redirectTo?: string }) => void} switchShop
 *                                                  Trigger a server-side shop switch.
 * @property {boolean}                  isReady     True when an activeShop has been
 *                                                  resolved.
 */

/**
 * Read the active shop, the list of available shops, and the switch helper
 * from ShopContext.
 *
 * @returns {ShopContextValue}
 */
export default function useActiveShop() {
    const ctx = useContext(ShopContext);

    if (ctx === null || ctx === undefined) {
        throw new Error(
            "useActiveShop() must be called inside <ShopProvider>. " +
                "Wrap your page in MainLayout (which provides ShopProvider) " +
                "or render <ShopProvider> at the top of your tree.",
        );
    }

    return ctx;
}
