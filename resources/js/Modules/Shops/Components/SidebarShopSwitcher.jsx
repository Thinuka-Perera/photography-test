/**
 * SidebarShopSwitcher
 * ----------------------------------------------------------------------------
 * Compact dropdown rendered just under the application logo in the sidebar.
 * Shows the currently active shop and lets the user jump to any other shop
 * the system has registered. Closes itself on outside click and on shop pick.
 *
 * Mounted by Sidebar.jsx. Reads shop data from ShopContext via useActiveShop.
 * ----------------------------------------------------------------------------
 */
import useActiveShop from "@/hooks/useActiveShop";
import { Menu, Transition } from "@headlessui/react";
import { Link } from "@inertiajs/react";
import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";
import { Fragment } from "react";

/**
 * @returns {JSX.Element|null}
 */
export default function SidebarShopSwitcher() {
    const { shops, activeShop, switchShop } = useActiveShop();

    if (!activeShop) {
        return (
            <Link
                href={route("shops.index")}
                className="flex items-center gap-2 rounded-xl border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700/50"
            >
                <Building2 className="h-4 w-4" />
                Select a shop
            </Link>
        );
    }

    return (
        <Menu as="div" className="relative">
            <Menu.Button className="flex w-full items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-left shadow-sm transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/70">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-300">
                    <Building2 className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                        Active shop
                    </span>
                    <span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">
                        {activeShop.name}
                    </span>
                </span>
                <ChevronsUpDown className="h-4 w-4 text-gray-400" />
            </Menu.Button>

            <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <Menu.Items className="absolute left-0 right-0 z-50 mt-2 origin-top rounded-xl border border-gray-200 bg-white p-1 shadow-lg focus:outline-none dark:border-slate-700 dark:bg-slate-800">
                    <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                        Switch shop
                    </p>

                    {shops.map(shop => {
                        const isActive =
                            Number(shop.id) === Number(activeShop.id);

                        return (
                            <Menu.Item key={shop.slug}>
                                {({ active }) => (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!isActive) switchShop(shop.slug);
                                        }}
                                        className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                                            active
                                                ? "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200"
                                                : "text-gray-700 dark:text-gray-200"
                                        }`}
                                    >
                                        <span className="min-w-0">
                                            <span className="block truncate font-medium">
                                                {shop.name}
                                            </span>
                                            {shop.address ? (
                                                <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                                                    {shop.address}
                                                </span>
                                            ) : null}
                                        </span>
                                        {isActive ? (
                                            <Check className="h-4 w-4 text-primary-600 dark:text-primary-300" />
                                        ) : null}
                                    </button>
                                )}
                            </Menu.Item>
                        );
                    })}

                    <Menu.Item>
                        {({ active }) => (
                            <Link
                                href={route("shops.index")}
                                className={`mt-1 flex items-center gap-2 rounded-lg border-t border-gray-100 px-3 py-2 text-sm transition-colors dark:border-slate-700 ${
                                    active
                                        ? "bg-gray-50 text-gray-700 dark:bg-slate-700/60 dark:text-gray-100"
                                        : "text-gray-500 dark:text-gray-400"
                                }`}
                            >
                                <Plus className="h-4 w-4" />
                                Manage shops
                            </Link>
                        )}
                    </Menu.Item>
                </Menu.Items>
            </Transition>
        </Menu>
    );
}
