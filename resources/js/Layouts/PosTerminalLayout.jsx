import Toast from "@/Components/Toast";
import ShopContext, { ShopProvider } from "@/Contexts/ShopContext";
import { ThemeProvider, useTheme } from "@/Contexts/ThemeContext";
import { Link, usePage } from "@inertiajs/react";
import {
    ChevronDown,
    LogOut,
    Moon,
    Store,
    Sun,
    LayoutGrid,
} from "lucide-react";
import { useContext, useEffect, useRef, useState } from "react";

function TerminalChrome({ title = "Point of Sale", subtitle }) {
    const { darkMode, toggleTheme } = useTheme();
    const { shops, activeShop, switchShop } = useContext(ShopContext);
    const { auth } = usePage().props;

    const roleSlug = auth?.access?.role_slug ?? auth?.user?.role?.slug;
    const canSwitchShops = ["cashier", "admin", "super_admin"].includes(roleSlug);

    const [shopDropdownOpen, setShopDropdownOpen] = useState(false);
    const shopDropdownRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (
                shopDropdownRef.current &&
                !shopDropdownRef.current.contains(event.target)
            ) {
                setShopDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-gray-200 bg-white px-5 py-2.5 dark:border-slate-700 dark:bg-dark-card">
            <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white shadow-md">
                    <LayoutGrid className="h-6 w-6" strokeWidth={1.5} />
                </div>
                <div className="min-w-0 leading-tight">
                    <h1 className="truncate text-lg font-bold text-gray-900 dark:text-white">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="truncate text-xs font-medium text-gray-500 dark:text-slate-400">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2.5">
                {canSwitchShops && shops.length > 1 && (
                    <div className="relative" ref={shopDropdownRef}>
                        <button
                            type="button"
                            onClick={() => setShopDropdownOpen((o) => !o)}
                            className="flex h-11 items-center gap-2.5 rounded-xl border border-transparent bg-slate-100 px-3 text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700"
                        >
                            <div className="rounded-lg bg-primary-500/10 p-1 text-primary-600 dark:text-primary-400">
                                <Store className="h-4 w-4" />
                            </div>
                            <div className="text-left">
                                <p className="mb-0.5 text-[10px] font-bold uppercase leading-none tracking-widest text-slate-400">
                                    Active Shop
                                </p>
                                <p className="max-w-[140px] truncate text-xs font-bold">
                                    {activeShop?.name || "Loading..."}
                                </p>
                            </div>
                            <ChevronDown
                                className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                                    shopDropdownOpen ? "rotate-180" : ""
                                }`}
                            />
                        </button>

                        {shopDropdownOpen && (
                            <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-gray-100 bg-white py-2 shadow-2xl dark:border-slate-700 dark:bg-dark-card">
                                <div className="mb-1 border-b border-gray-50 px-4 py-2 dark:border-slate-800">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                        Select Location
                                    </p>
                                </div>
                                <div className="max-h-72 overflow-y-auto px-1">
                                    {shops.map((shop) => (
                                        <button
                                            key={shop.id}
                                            type="button"
                                            onClick={() => {
                                                switchShop(shop.slug);
                                                setShopDropdownOpen(false);
                                            }}
                                            className={`mb-0.5 flex min-h-[44px] w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-all ${
                                                String(activeShop?.id) ===
                                                String(shop.id)
                                                    ? "bg-primary-500/10 font-bold text-primary-600 dark:text-primary-400"
                                                    : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`h-2 w-2 rounded-full ${
                                                        String(activeShop?.id) ===
                                                        String(shop.id)
                                                            ? "animate-pulse bg-primary-500"
                                                            : "bg-slate-300 dark:bg-slate-600"
                                                    }`}
                                                />
                                                {shop.name}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <button
                    type="button"
                    onClick={toggleTheme}
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    aria-label="Toggle theme"
                >
                    {darkMode ? (
                        <Sun className="h-5 w-5 text-yellow-500" />
                    ) : (
                        <Moon className="h-5 w-5 text-slate-700" />
                    )}
                </button>

                <Link
                    href="/dashboard"
                    className="flex h-11 items-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                    <LayoutGrid className="h-5 w-5" strokeWidth={1.5} />
                    <span className="hidden sm:inline">Back Office</span>
                </Link>

                <Link
                    href={route("logout")}
                    method="post"
                    as="button"
                    className="flex h-11 items-center gap-2 rounded-xl bg-danger-50 px-4 text-sm font-semibold text-danger-600 transition-colors hover:bg-danger-500 hover:text-white dark:bg-danger-500/10 dark:text-danger-500 dark:hover:bg-danger-500 dark:hover:text-white"
                >
                    <LogOut className="h-5 w-5" strokeWidth={1.5} />
                    <span className="hidden sm:inline">Logout</span>
                </Link>
            </div>
        </header>
    );
}

/**
 * @param {{ children: React.ReactNode, title?: string, subtitle?: string }} props
 * @returns {JSX.Element}
 */
export default function PosTerminalLayout({ children, title, subtitle }) {
    return (
        <ThemeProvider>
            <ShopProvider>
                <div className="flex h-[100dvh] w-screen flex-col overflow-hidden bg-light-bg font-sans text-light-text dark:bg-dark-bg dark:text-dark-text">
                    <TerminalChrome title={title} subtitle={subtitle} />

                    <main className="min-h-0 flex-1 overflow-y-auto">
                        {children}
                    </main>

                    <Toast />
                </div>
            </ShopProvider>
        </ThemeProvider>
    );
}
