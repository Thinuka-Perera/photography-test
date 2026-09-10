import SidebarShopSwitcher from "@/Modules/Shops/Components/SidebarShopSwitcher";
import { Link, usePage } from "@inertiajs/react";
import { useLayoutEffect, useRef, useState, useEffect } from "react";
import {
    BarChart3,
    Building2,
    CalendarDays,
    Camera,
    ChevronDown,
    ChevronRight,
    Cog,
    History,
    LayoutDashboard,
    MessageCircle,
    Package,
    PackageSearch,
    PanelLeft,
    Printer,
    Receipt,
    ReceiptText,
    RefreshCcw,
    Shield,
    ShoppingBag,
    SquareStack,
    Tag,
    Ticket,
    Undo,
    UserRound,
    Users2,
    WalletCards,
} from "lucide-react";

const iconMap = {
    dashboard: LayoutDashboard,
    "studio-dashboard": Printer,
    "studio-pos": PanelLeft,
    "sales-history": ReceiptText,
    "daily-sales-report": BarChart3,
    "product-reports": BarChart3,
    "credit-management": WalletCards,
    "studio.credit_management": WalletCards,
    "event-management": Camera,
    quotations: Ticket,
    packages: SquareStack,
    inventory: Package,
    "stock-tracking": PackageSearch,
    "purchase-history": History,
    categories: Tag,
    employees: Users2,
    attendance: CalendarDays,
    salaries: WalletCards,
    customers: UserRound,
    invoices: Receipt,
    refunds: RefreshCcw,
    returns: Undo,
    "whatsapp-hub": MessageCircle,
    "user-management": Users2,
    "role-access": Shield,
    shops: Building2,
    settings: Cog,
};

function MenuItem({ item, isActive }) {
    const Icon = iconMap[item.key] ?? Cog;

    return (
        <Link
            href={item.href}
            data-active-nav={isActive ? "true" : undefined}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors duration-200 ${isActive
                ? "bg-primary-500 text-white"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                }`}
        >
            <Icon className="w-5 h-5" />
            <span className="font-medium text-sm">{item.label}</span>
        </Link>
    );
}

function ReportsDropdown({ item, currentPath }) {
    const [isOpen, setIsOpen] = useState(currentPath.startsWith('/reports'));
    const Icon = iconMap["daily-sales-report"] ?? BarChart3;

    useEffect(() => {
        if (currentPath.startsWith('/reports')) {
            setIsOpen(true);
        }
    }, [currentPath]);

    const isGroupActive = currentPath.startsWith('/reports');

    return (
        <div className="space-y-1">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg transition-colors duration-200 text-left ${isGroupActive
                    ? "bg-slate-100 dark:bg-slate-700/60 text-slate-900 dark:text-white font-semibold"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                    }`}
            >
                <div className="flex items-center gap-3 font-medium">
                    <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm">{item.label}</span>
                </div>
                {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                )}
            </button>

            {isOpen && (
                <div className="pl-4 space-y-1 border-l border-gray-200 dark:border-slate-700 ml-6 mt-1 underline-none">
                    {item.subItems.map((sub) => {
                        const isSubActive = currentPath === sub.href;
                        return (
                            <Link
                                key={sub.key}
                                href={sub.href}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium ${isSubActive
                                    ? "text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-slate-700/40"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-700/20"
                                    }`}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full ${isSubActive ? 'bg-blue-500 dark:bg-blue-400' : 'bg-gray-300 dark:bg-slate-600'
                                    }`} />
                                <span className="truncate">{sub.label}</span>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function Sidebar() {
    const page = usePage();
    const { auth, navigation, shopSettings } = page.props;
    const navScrollRef = useRef(null);

    const currentPath = (() => {
        const u = page.url;
        if (typeof u !== "string" || !u) {
            return window.location.pathname.split("?")[0];
        }
        try {
            if (u.startsWith("http")) {
                return new URL(u).pathname;
            }
            return u.split("?")[0];
        } catch {
            return window.location.pathname.split("?")[0];
        }
    })();

    useLayoutEffect(() => {
        const nav = navScrollRef.current;
        if (!nav) {
            return;
        }
        const active = nav.querySelector('[data-active-nav="true"]');
        if (!(active instanceof HTMLElement)) {
            return;
        }
        // Center the active link in the scrollport so it is not stuck on the bottom
        // edge (which "nearest" often does and clips the row / focus ring).
        active.scrollIntoView({ block: "center", inline: "nearest" });
    }, [page.url]);
    const pageKeys = new Set(auth?.access?.page_keys ?? []);
    const availablePages = navigation?.pages ?? [];

    const pages = availablePages.filter(
        page => pageKeys.has(page.key) && page.key !== "settings" && page.key !== "studio-bills" && page.href !== "#",
    );

    const settingsPage = availablePages.find(
        page => page.key === "settings" && pageKeys.has("settings"),
    );

    const reportPages = pages.filter(p => p.href.startsWith('/reports'));
    const sections = [];
    const addedReportDropdown = new Set();

    pages.forEach(page => {
        const isReport = page.href.startsWith('/reports');
        const sectionLabel = page.section;

        let section = sections.find(group => group.label === sectionLabel);
        if (!section) {
            section = {
                label: sectionLabel,
                items: [],
            };
            sections.push(section);
        }

        if (isReport) {
            if (!addedReportDropdown.has(sectionLabel)) {
                addedReportDropdown.add(sectionLabel);
                section.items.push({
                    key: 'reports-dropdown',
                    label: 'Reports',
                    href: '/reports',
                    isReportGroup: true,
                    subItems: reportPages
                });
            }
        } else {
            section.items.push(page);
        }
    });

    const activeItem = [...pages, ...(settingsPage ? [settingsPage] : [])]
        .sort((a, b) => b.href.length - a.href.length)
        .find(
            item =>
                currentPath === item.href ||
                currentPath.startsWith(`${item.href}/`),
        );

    const isActive = item => activeItem?.href === item.href;

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex flex-col z-40">
            <div className="p-6 border-b border-gray-200 dark:border-slate-700">
                <Link href="/dashboard" className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-100 aspect-square dark:bg-slate-700">
                        {shopSettings?.shop_logo_url ? (
                            <img
                                src={shopSettings.shop_logo_url}
                                alt="Logo"
                                className="block h-full w-full object-cover"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center">
                                <Camera className="h-6 w-6 text-gray-600" />
                            </div>
                        )}
                    </div>
                    <div>
                        <h1 className="font-bold text-lg text-gray-900 dark:text-white">
                            {shopSettings?.shop_name ?? "Photography Shop"}
                        </h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Management System
                        </p>
                    </div>
                </Link>
            </div>

            {/* Active-shop switcher — drives all shop-aware modules */}
            <div className="px-4 pt-4">
                <SidebarShopSwitcher />
            </div>

            <nav
                ref={navScrollRef}
                className="flex-1 p-4 overflow-y-auto scrollbar-none"
            >
                {sections.map((section, sectionIndex) => (
                    <div
                        key={section.label}
                        className={sectionIndex > 0 ? "mt-6" : ""}
                    >
                        {section.label ? (
                            <p className="px-4 mb-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                {section.label}
                            </p>
                        ) : null}

                        <div className="space-y-1">
                            {section.items.map(item => (
                                item.isReportGroup ? (
                                    <ReportsDropdown
                                        key={item.key}
                                        item={item}
                                        currentPath={currentPath}
                                    />
                                ) : (
                                    <MenuItem
                                        key={item.key}
                                        item={item}
                                        isActive={isActive(item)}
                                    />
                                )
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {settingsPage ? (
                <div className="p-4 border-t border-gray-200 dark:border-slate-700">
                    <MenuItem
                        item={settingsPage}
                        isActive={isActive(settingsPage)}
                    />
                </div>
            ) : null}
        </aside>
    );
}
