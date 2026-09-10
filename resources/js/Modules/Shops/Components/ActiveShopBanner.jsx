/**
 * ActiveShopBanner
 * ----------------------------------------------------------------------------
 * Compact banner rendered at the top of every shop-aware page (Central
 * Inventory, Stock Tracking, Purchase History, Categories) so the user
 * always knows which shop's data they're looking at and can switch with
 * one click.
 *
 * Visual: a slim pill with the shop name + address on the left, and a
 * "Switch shop" link on the right. Designed to slot above existing page
 * content without altering the existing UI design.
 * ----------------------------------------------------------------------------
 */
import useActiveShop from "@/hooks/useActiveShop";
import { Link } from "@inertiajs/react";
import { Building2, ChevronRight } from "lucide-react";

/**
 * @returns {JSX.Element|null}
 */
export default function ActiveShopBanner() {
    const { activeShop } = useActiveShop();

    if (!activeShop) {
        return null;
    }

    return (
        <div className="flex items-center justify-between rounded-2xl border border-primary-100 bg-primary-50/70 px-4 py-3 dark:border-primary-900/40 dark:bg-primary-900/10">
            <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-300">
                    <Building2 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-700 dark:text-primary-300">
                        Active shop
                    </p>
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                        {activeShop.name}
                        {activeShop.address ? (
                            <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                                · {activeShop.address}
                            </span>
                        ) : null}
                    </p>
                </div>
            </div>

            <Link
                href={route("shops.index")}
                className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-primary-700 shadow-sm transition-colors hover:bg-primary-100 dark:bg-slate-800 dark:text-primary-200 dark:hover:bg-slate-700"
            >
                Switch shop
                <ChevronRight className="h-3.5 w-3.5" />
            </Link>
        </div>
    );
}
