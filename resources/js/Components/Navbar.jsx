import { useTheme } from "@/Contexts/ThemeContext";
import ShopContext from "@/Contexts/ShopContext";
import { Link, usePage, router } from "@inertiajs/react";
import { Bell, ChevronDown, Moon, Search, Sun, Store } from "lucide-react";
import { useEffect, useRef, useState, useContext } from "react";

export default function Navbar({ pageTitle = "Overview" }) {
    const { darkMode, toggleTheme } = useTheme();
    const { shops, activeShop, switchShop } = useContext(ShopContext);
    const { auth, navigation, birthdayReminders = [] } = usePage().props;

    const isAdmin = auth?.user?.roles?.some(r => ['admin', 'super_admin'].includes(r.name)) ||
        auth?.access?.role_name?.toLowerCase()?.includes('admin');

    const canAccessSettings = Boolean(auth?.access?.page_lookup?.settings);
    const [globalSearch, setGlobalSearch] = useState("");
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [shopDropdownOpen, setShopDropdownOpen] = useState(false);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const dropdownRef = useRef(null);
    const shopDropdownRef = useRef(null);
    const notificationRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target)
            ) {
                setDropdownOpen(false);
            }
            if (
                shopDropdownRef.current &&
                !shopDropdownRef.current.contains(event.target)
            ) {
                setShopDropdownOpen(false);
            }
            if (
                notificationRef.current &&
                !notificationRef.current.contains(event.target)
            ) {
                setNotificationOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleGlobalSearch = (e) => {
        e.preventDefault();
        const query = globalSearch.trim();
        if (!query) return;

        const pageKeys = new Set(auth?.access?.page_keys ?? []);
        const availablePages = (navigation?.pages ?? []).filter(page => page.href !== "#");
        const isSuperAdmin = auth?.access?.is_super_admin ?? false;

        // 1. Try to find a matching page for quick navigation
        const normalizedQuery = query.toLowerCase();
        const matchingPage = availablePages.find(page => {
            const hasAccess = isSuperAdmin || pageKeys.has(page.key);
            const labelMatch = page.label.toLowerCase().includes(normalizedQuery);
            const keyMatch = page.key.toLowerCase().includes(normalizedQuery);
            return hasAccess && (labelMatch || keyMatch);
        });

        if (matchingPage) {
            setGlobalSearch(""); // Clear search on navigation
            router.get(matchingPage.href);
            return;
        }

        // 2. Fallback to contextual search logic
        const path = window.location.pathname;
        if (path.includes("/customers")) {
            router.get(route("customers.index"), { search: query });
        } else if (path.includes("/employees")) {
            router.get(route("employees.index"), { search: query });
        } else if (path.includes("/photography/events")) {
            router.get(route("photography.events.index"), { search: query });
        } else if (path.includes("/finance/invoices")) {
            router.get(route("finance.invoices.index"), { search: query });
        } else {
            // Default to products search
            router.get(route("products.index"), { search: query });
        }
    };

    return (
        <header className="sticky top-0 z-30 bg-white dark:bg-dark-card border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between px-6 py-4">
                {/* Left Section: Title & Shop Switcher */}
                <div className="flex items-center gap-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {pageTitle}
                    </h1>

                    {isAdmin && shops.length > 1 && (
                        <div className="relative" ref={shopDropdownRef}>
                            <button
                                onClick={() => setShopDropdownOpen(!shopDropdownOpen)}
                                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-transparent hover:border-slate-300 dark:hover:border-slate-600 shadow-sm"
                            >
                                <div className="p-1 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400">
                                    <Store className="w-3.5 h-3.5" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Active Shop</p>
                                    <p className="text-xs font-bold truncate max-w-[120px]">{activeShop?.name || 'Loading...'}</p>
                                </div>
                                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${shopDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {shopDropdownOpen && (
                                <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-dark-card rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="px-4 py-2 border-b border-gray-50 dark:border-slate-800 mb-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Location</p>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto px-1">
                                        {shops.map((shop) => (
                                            <button
                                                key={shop.id}
                                                onClick={() => {
                                                    switchShop(shop.slug);
                                                    setShopDropdownOpen(false);
                                                }}
                                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all mb-0.5 ${String(activeShop?.id) === String(shop.id) ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${String(activeShop?.id) === String(shop.id) ? 'bg-primary-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                                    {shop.name}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Section */}
                <div className="flex items-center gap-4">
                    {/* Search Bar */}
                    <form onSubmit={handleGlobalSearch} className="relative hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={globalSearch}
                            onChange={(e) => setGlobalSearch(e.target.value)}
                            placeholder="Search everything..."
                            className="w-64 pl-10 pr-4 py-2 bg-gray-100 dark:bg-slate-700 border-0 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 transition-all"
                        />
                    </form>

                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                        aria-label="Toggle theme"
                    >
                        {darkMode ? (
                            <Sun className="w-5 h-5 text-yellow-500" />
                        ) : (
                            <Moon className="w-5 h-5 text-slate-700" />
                        )}
                    </button>

                    {/* Notifications */}
                    <div className="relative" ref={notificationRef}>
                        <button
                            onClick={() => setNotificationOpen(!notificationOpen)}
                            className="relative p-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                            aria-label="Notifications"
                        >
                            <Bell className="w-5 h-5" />
                            {birthdayReminders.length > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                                    {birthdayReminders.length}
                                </span>
                            )}
                        </button>

                        {/* Notifications Dropdown */}
                        {notificationOpen && (
                            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-dark-card rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-2 z-50">
                                <div className="px-4 py-2 border-b border-gray-200 dark:border-slate-700">
                                    <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                                </div>
                                <div className="max-h-96 overflow-y-auto">
                                    {birthdayReminders.length === 0 ? (
                                        <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                                            No new notifications
                                        </div>
                                    ) : (
                                        birthdayReminders.map((reminder) => (
                                            <div
                                                key={reminder.id}
                                                className="border-b border-gray-200 px-4 py-3 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-700"
                                            >
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                    Employee birthday
                                                </p>
                                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                    {reminder.message}
                                                </p>
                                                <p className="mt-2 text-xs text-pink-600 dark:text-pink-300">
                                                    {reminder.reminder_type === "week"
                                                        ? "1 week reminder"
                                                        : reminder.reminder_type === "day"
                                                            ? "1 day reminder"
                                                            : "Today"}
                                                </p>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="px-4 py-2 border-t border-gray-200 dark:border-slate-700 text-center">
                                    {auth?.access?.page_lookup?.employees ? (
                                        <Link
                                            href={route("employees.index")}
                                            onClick={() => setNotificationOpen(false)}
                                            className="inline-block rounded-lg bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-600 transition-colors hover:text-primary-700 dark:bg-primary-900/20 dark:text-primary-400 dark:hover:text-primary-300"
                                        >
                                            View employees →
                                        </Link>
                                    ) : (
                                        <span className="text-sm text-gray-400">No more alerts</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Profile Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:hover:bg-slate-700 transition-colors"
                        >
                            <div className="w-9 h-9 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold">
                                {auth?.user?.name?.charAt(0)?.toUpperCase() ||
                                    "A"}
                            </div>
                            <div className="hidden md:block text-left">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {auth?.user?.name || "Admin"}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {auth?.access?.role_name || "No role assigned"}
                                </p>
                            </div>
                            <ChevronDown className="w-4 h-4 text-gray-500 hidden md:block" />
                        </button>

                        {/* Dropdown Menu */}
                        {dropdownOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-card rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-1 z-50">
                                <Link
                                    href={route("profile.edit")}
                                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                                >
                                    Profile
                                </Link>
                                {canAccessSettings ? (
                                    <Link
                                        href="/settings"
                                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                                    >
                                        Settings
                                    </Link>
                                ) : null}
                                <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                                    {auth?.user?.email ?? ""}
                                </div>
                                <hr className="my-1 border-gray-200 dark:border-slate-700" />
                                <Link
                                    href={route("logout")}
                                    method="post"
                                    as="button"
                                    className="w-full text-left block px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                                >
                                    Log Out
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
